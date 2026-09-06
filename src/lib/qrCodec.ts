import { FamilyTree } from '../types/family';
import { treeToCSV } from './serializer';
import { parseRawText } from './parser';

/**
 * Browser-safe Uint8Array to Base64URL
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const CHUNK_SIZE = 8192;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Browser-safe Base64URL to Uint8Array
 */
export function base64UrlToBytes(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Compresses string to Base64URL using native browser CompressionStream ('deflate-raw')
 */
export async function compressTextToBase64Url(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);

  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  await writer.write(rawBytes);
  await writer.close();

  const buffer = await new Response(cs.readable).arrayBuffer();
  return bytesToBase64Url(new Uint8Array(buffer));
}

/**
 * Decompresses Base64URL string to original text using native browser DecompressionStream ('deflate-raw')
 */
export async function decompressBase64UrlToText(base64Url: string): Promise<string> {
  const compressedBytes = base64UrlToBytes(base64Url);

  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  await writer.write(compressedBytes);
  await writer.close();

  const buffer = await new Response(ds.readable).arrayBuffer();
  return new TextDecoder().decode(buffer);
}

/**
 * Generates the full QR URL (bonsho-bd.github.io/view/qr-v0/<compressed-data>)
 */
export async function generateQRUrlForTree(tree: FamilyTree): Promise<{
  url: string;
  compressedData: string;
  rawByteCount: number;
  compressedByteCount: number;
}> {
  const csv = treeToCSV(tree);
  const rawByteCount = new TextEncoder().encode(csv).length;
  const compressedData = await compressTextToBase64Url(csv);
  const compressedByteCount = compressedData.length;

  const origin = window.location.origin;
  // Strip any trailing slash or existing /view/ subpaths
  const basePath = window.location.pathname
    .replace(/\/view\/.*$/, '')
    .replace(/\/$/, '');

  const url = `${origin}${basePath}/view/qr-v0/${compressedData}`;

  return {
    url,
    compressedData,
    rawByteCount,
    compressedByteCount,
  };
}

/**
 * Reads and decompresses QR data from the URL path, hash, or redirect parameter
 */
export async function extractTreeFromCurrentUrl(): Promise<FamilyTree | null> {
  let qrData: string | null = null;

  // 1. Check window.location.pathname: e.g. /view/qr-v0/<compressedData>
  const pathMatch = window.location.pathname.match(/\/view\/qr-v0\/([A-Za-z0-9_-]+)/);
  if (pathMatch) {
    qrData = pathMatch[1];
  }

  // 2. Check window.location.hash: e.g. #/view/qr-v0/<compressedData>
  if (!qrData && window.location.hash) {
    const hashMatch = window.location.hash.match(/\/view\/qr-v0\/([A-Za-z0-9_-]+)/);
    if (hashMatch) {
      qrData = hashMatch[1];
    }
  }

  // 3. Check window.location.search: e.g. ?redirect=/view/qr-v0/<compressedData>
  if (!qrData && window.location.search) {
    const searchParams = new URLSearchParams(window.location.search);
    const redirectParam = searchParams.get('redirect');
    if (redirectParam) {
      const redirectMatch = decodeURIComponent(redirectParam).match(/\/view\/qr-v0\/([A-Za-z0-9_-]+)/);
      if (redirectMatch) {
        qrData = redirectMatch[1];
      }
    }
  }

  if (!qrData) return null;

  try {
    const decompressedText = await decompressBase64UrlToText(qrData);
    if (!decompressedText.trim()) return null;
    return parseRawText(decompressedText);
  } catch (err) {
    console.error('Failed to decompress QR data from URL:', err);
    return null;
  }
}
