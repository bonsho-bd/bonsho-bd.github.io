declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

// Environment variables or fallback local storage
export function getGoogleConfig() {
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const envApiKey = import.meta.env.VITE_GOOGLE_API_KEY || '';

  const storedClientId = localStorage.getItem('bonsho_g_client_id') || '';
  const storedApiKey = localStorage.getItem('bonsho_g_api_key') || '';

  return {
    clientId: storedClientId || envClientId,
    apiKey: storedApiKey || envApiKey,
  };
}

export function saveGoogleConfig(clientId: string, apiKey: string) {
  if (clientId) localStorage.setItem('bonsho_g_client_id', clientId.trim());
  if (apiKey) localStorage.setItem('bonsho_g_api_key', apiKey.trim());
}

export function isGoogleSyncAvailable(): boolean {
  const { clientId } = getGoogleConfig();
  return Boolean(clientId && clientId.trim().length > 0);
}

/**
 * Dynamically loads Google Identity Services (GIS) and GAPI scripts
 */
export function loadGoogleScripts(): Promise<void> {
  return new Promise((resolve) => {
    let gisLoaded = false;
    let gapiLoaded = false;

    function checkDone() {
      if (gisLoaded && gapiLoaded) resolve();
    }

    // 1. Google Identity Services (GIS)
    if (window.google?.accounts?.oauth2) {
      gisLoaded = true;
    } else {
      const script1 = document.createElement('script');
      script1.src = 'https://accounts.google.com/gsi/client';
      script1.async = true;
      script1.defer = true;
      script1.onload = () => {
        gisLoaded = true;
        checkDone();
      };
      document.head.appendChild(script1);
    }

    // 2. GAPI (for Drive Picker)
    if (window.gapi) {
      gapiLoaded = true;
    } else {
      const script2 = document.createElement('script');
      script2.src = 'https://apis.google.com/js/api.js';
      script2.async = true;
      script2.defer = true;
      script2.onload = () => {
        window.gapi.load('picker', () => {
          gapiLoaded = true;
          checkDone();
        });
      };
      document.head.appendChild(script2);
    }

    checkDone();
  });
}

/**
 * Requests an OAuth 2.0 access token with drive.file and spreadsheets scopes
 */
export function requestGoogleAccessToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services SDK not loaded'));
    }

    if (!clientId) {
      return reject(new Error('Google Client ID is missing. Please configure Client ID.'));
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
      callback: (response: any) => {
        if (response.error) {
          return reject(new Error(response.error_description || response.error));
        }
        if (response.access_token) {
          resolve(response.access_token);
        } else {
          reject(new Error('No access token received'));
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

/**
 * Opens Google Drive Picker to select a private Google Sheet
 */
export function openGoogleDrivePicker(
  accessToken: string,
  apiKey: string,
  onPick: (doc: { id: string; name: string }) => void
): void {
  if (!window.google?.picker) {
    alert('Google Picker API is not ready yet. Please try again in a few seconds.');
    return;
  }

  const view = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS)
    .setMimeTypes('application/vnd.google-apps.spreadsheet');

  const builder = new window.google.picker.PickerBuilder()
    .addView(view)
    .setOAuthToken(accessToken);

  if (apiKey) {
    builder.setDeveloperKey(apiKey);
  }

  builder.setCallback((data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const doc = data.docs[0];
      if (doc) {
        onPick({ id: doc.id, name: doc.name });
      }
    }
  });

  const picker = builder.build();
  picker.setVisible(true);
}

/**
 * Extracts Sheet ID from any Google Sheets URL or raw ID
 */
export function extractSheetId(urlOrId: string): string {
  const clean = urlOrId.trim();
  // Match standard /d/<sheetId> format (with optional /u/0/, /u/1/, etc.)
  const match = clean.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Fallback: If user pasted a clean ID without slashes
  if (!clean.includes('/')) {
    return clean;
  }
  // If it's a URL but didn't match /d/, try to find the longest alphanumeric segment
  const segments = clean.split(/[/?#&]/);
  for (const seg of segments) {
    if (seg.length >= 25 && /^[a-zA-Z0-9-_]+$/.test(seg)) {
      return seg;
    }
  }
  return clean;
}

/**
 * Fetches 2-column values from a private Google Sheet using OAuth access token
 */
export async function fetchGoogleSheetValues(
  sheetId: string,
  accessToken: string
): Promise<{ key: string; value: string }[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:B`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const rawMsg = errorData.error?.message || `HTTP ${res.status}`;
    if (res.status === 404 || rawMsg.includes('Requested entity was not found')) {
      throw new Error(
        'শিটটি পাওয়া যায়নি (404 Not Found)। নিশ্চিত করুন আপনার সাইন-ইন করা গুগল অ্যাকাউন্টে শিটটির অ্যাক্সেস রয়েছে বা শিটের শেয়ারিং অপশনে "Anyone with the link can edit" চালু রয়েছে।'
      );
    }
    throw new Error(rawMsg);
  }

  const data = await res.json();
  const rows: [string, string][] = data.values || [];

  return rows.map(r => ({
    key: (r[0] || '').toString(),
    value: (r[1] || '').toString(),
  }));
}

/**
 * Creates a brand new Google Sheet in user's Drive and saves family tree rows into it
 */
export async function createGoogleSheet(
  title: string,
  accessToken: string,
  rows: [string, string][] = []
): Promise<{ id: string; name: string; url: string }> {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || 'বংশ ফ্যামিলি ট্রি',
      },
      sheets: [
        {
          properties: {
            title: 'বংশতালিকা',
            gridProperties: {
              columnCount: 2,
            },
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create sheet: HTTP ${res.status}`);
  }

  const sheetData = await res.json();
  const sheetId = sheetData.spreadsheetId;
  const sheetUrl = sheetData.spreadsheetUrl;

  if (rows.length > 0) {
    await saveGoogleSheetValues(sheetId, accessToken, rows);
  }

  return { id: sheetId, name: title || 'বংশ ফ্যামিলি ট্রি', url: sheetUrl };
}

/**
 * Saves 2-column values back to a private Google Sheet using OAuth access token
 */
export async function saveGoogleSheetValues(
  sheetId: string,
  accessToken: string,
  rows: [string, string][]
): Promise<void> {
  // Clear existing A:B range first to prevent leftover rows
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:B:clear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {
    // Ignore clear errors on newly created or empty sheets
  }

  // Write updated 2-column rows
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to save sheet: HTTP ${res.status}`);
  }
}
