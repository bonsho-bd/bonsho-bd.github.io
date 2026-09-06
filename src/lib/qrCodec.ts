import { deflateRaw, inflateRaw } from 'pako';
import { FamilyGraph } from '../types/family';
import { graphToCSV } from './serializer';
import { parseRawText } from './parser';
import QRCode from 'qrcode';

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
 * Compresses string to Base64URL using standard RFC 1951 raw deflate
 */
export function compressTextToBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const compressed = deflateRaw(bytes, { level: 9 });
  return bytesToBase64Url(compressed);
}

/**
 * Decompresses Base64URL string to original text using standard raw inflate
 */
export function decompressBase64UrlToText(base64Url: string): string {
  const compressed = base64UrlToBytes(base64Url);
  const decompressed = inflateRaw(compressed);
  return new TextDecoder().decode(decompressed);
}

/**
 * Generates the full QR URL (bonsho-bd.github.io/?qr-v0=<compressed-data>)
 */
export function generateQRUrlForTree(graph: FamilyGraph): {
  url: string;
  compressedData: string;
  rawByteCount: number;
  compressedByteCount: number;
} {
  const csv = graphToCSV(graph);
  const rawByteCount = new TextEncoder().encode(csv).length;
  const compressedData = compressTextToBase64Url(csv);
  const compressedByteCount = compressedData.length;

  const origin = window.location.origin;
  // Clean base path (e.g. "" or repository path if in subfolder)
  const basePath = window.location.pathname
    .replace(/\/view\/.*$/, '')
    .replace(/index\.html$/, '')
    .replace(/\/$/, '');

  // 0-redirect query param (?qr-v0=) allows instant loading on GitHub Pages and static hosts,
  // and cleanly composes with other parameters (e.g. ?lang=en)
  const url = `${origin}${basePath}/?qr-v0=${compressedData}`;

  return {
    url,
    compressedData,
    rawByteCount,
    compressedByteCount,
  };
}

/**
 * Reads and decompresses QR data from URL query params, hash, or legacy path
 */
export function extractTreeFromCurrentUrl(): FamilyGraph | null {
  let qrData: string | null = null;

  // 1. Check primary query parameter: ?qr-v0=<compressedData>
  if (window.location.search) {
    const searchParams = new URLSearchParams(window.location.search);
    const qrParam = searchParams.get('qr-v0');
    if (qrParam) {
      qrData = qrParam;
    } else {
      // Fallback query parameters: ?d=<compressedData> or ?redirect=/view/qr-v0/<compressedData>
      const dParam = searchParams.get('d');
      if (dParam) {
        qrData = dParam;
      } else {
        const redirectParam = searchParams.get('redirect');
        if (redirectParam) {
          const redirectMatch = decodeURIComponent(redirectParam).match(/view\/qr-v0\/([A-Za-z0-9_-]+)/);
          if (redirectMatch) {
            qrData = redirectMatch[1];
          }
        }
      }
    }
  }

  // 2. Fallback check window.location.hash: e.g. #/view/qr-v0/<compressedData>
  if (!qrData && window.location.hash) {
    const hashMatch = window.location.hash.match(/view\/qr-v0\/([A-Za-z0-9_-]+)/);
    if (hashMatch) {
      qrData = hashMatch[1];
    }
  }

  // 3. Fallback check window.location.pathname: e.g. /view/qr-v0/<compressedData>
  if (!qrData && window.location.pathname) {
    const pathMatch = window.location.pathname.match(/\/view\/qr-v0\/([A-Za-z0-9_-]+)/);
    if (pathMatch) {
      qrData = pathMatch[1];
    }
  }

  if (!qrData) return null;

  try {
    const decompressedText = decompressBase64UrlToText(qrData);
    if (!decompressedText.trim()) return null;
    return parseRawText(decompressedText);
  } catch (err) {
    console.error('Failed to decompress QR data from URL:', err);
    return null;
  }
}


export async function generateQRCodeWithLogo(text: string): Promise<string> {
  const canvas = document.createElement('canvas');
  const size = 1000;
  canvas.width = size;
  canvas.height = size;

  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 1,
    color: {
      dark: '#0f172a', // slate-900
      light: '#ffffff'
    },
    errorCorrectionLevel: 'H'
  });

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  const logo = new Image();
  const baseUrl = import.meta.env.BASE_URL || '/';
  logo.src = `${baseUrl.replace(/\/$/, '')}/graph-icon.svg`;
  await new Promise((resolve) => {
    logo.onload = resolve;
    logo.onerror = resolve;
  });

  const logoSize = size * 0.22;
  const offset = (size - logoSize) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, (logoSize / 2) + (size * 0.02), 0, Math.PI * 2);
  ctx.fill();

  ctx.drawImage(logo, offset, offset, logoSize, logoSize);
  return canvas.toDataURL('image/png');
}
