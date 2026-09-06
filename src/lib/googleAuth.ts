declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

// --- Domain Models ---

export type AccessToken = string;
export type SheetId = string;
export type ClientId = string;
export type ApiKey = string;

export interface SheetRow {
  key: string;
  value: string;
}

export interface GoogleConfig {
  clientId: ClientId;
  apiKey: ApiKey;
}

export interface ConnectedSheet {
  id: SheetId;
  name: string;
  url?: string;
}

// --- Configuration ---

export const getGoogleConfig = (): GoogleConfig => ({
  clientId: localStorage.getItem('bonsho_g_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  apiKey: localStorage.getItem('bonsho_g_api_key') || import.meta.env.VITE_GOOGLE_API_KEY || '',
});

export const saveGoogleConfig = (clientId: ClientId, apiKey: ApiKey): void => {
  if (clientId) localStorage.setItem('bonsho_g_client_id', clientId.trim());
  if (apiKey) localStorage.setItem('bonsho_g_api_key', apiKey.trim());
};

export const isGoogleSyncAvailable = (): boolean =>
  Boolean(getGoogleConfig().clientId?.trim().length > 0);

// --- Core API Abstractions ---

const handleApiError = async (res: Response): Promise<never> => {
  if (res.status === 401) {
    localStorage.removeItem('bonsho_access_token');
    throw new Error('গুগল সাইন-ইনের মেয়াদ শেষ হয়েছে (Session Expired)। অনুগ্রহ করে পুনরায় গুগল সাইন-ইন করুন।');
  }

  const errorData = await res.json().catch(() => ({}));
  const rawMsg = errorData.error?.message || `HTTP ${res.status}`;

  if (res.status === 404 || rawMsg.includes('Requested entity was not found')) {
    throw new Error('শিটটি পাওয়া যায়নি (404 Not Found)। নিশ্চিত করুন আপনার সাইন-ইন করা গুগল অ্যাকাউন্টে শিটটির অ্যাক্সেস রয়েছে বা শিটের শেয়ারিং অপশনে "Anyone with the link can edit" চালু রয়েছে।');
  }

  throw new Error(rawMsg);
};

const fetchApi = async <T>(url: string, options: RequestInit): Promise<T> => {
  const res = await fetch(url, options);
  return res.ok ? res.json() : handleApiError(res);
};

// --- Google Scripts & Auth ---

export const loadGoogleScripts = (): Promise<void> => new Promise((resolve) => {
  let gisLoaded = Boolean(window.google?.accounts?.oauth2);
  let gapiLoaded = Boolean(window.gapi);

  const checkDone = () => { if (gisLoaded && gapiLoaded) resolve(); };

  if (!gisLoaded) {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => { gisLoaded = true; checkDone(); };
    document.head.appendChild(script);
  }

  if (!gapiLoaded) {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load('picker', () => { gapiLoaded = true; checkDone(); });
    };
    document.head.appendChild(script);
  }

  checkDone();
});

export const requestGoogleAccessToken = (clientId: ClientId): Promise<AccessToken> =>
  new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) return reject(new Error('Google Identity Services SDK not loaded'));
    if (!clientId) return reject(new Error('Google Client ID is missing. Please configure Client ID.'));

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
      callback: (response: any) => response.error
        ? reject(new Error(response.error_description || response.error))
        : response.access_token
          ? resolve(response.access_token)
          : reject(new Error('No access token received')),
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });

// --- UI Components Integration ---

export const openGoogleDrivePicker = (
  accessToken: AccessToken,
  apiKey: ApiKey,
  onPick: (doc: ConnectedSheet) => void
): void => {
  if (!window.google?.picker) throw new Error('গুগল ড্রাইভ পিকার এখনো প্রস্তুত নয়। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।');

  const view = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS)
    .setMimeTypes('application/vnd.google-apps.spreadsheet');

  const builder = new window.google.picker.PickerBuilder()
    .addView(view)
    .setOAuthToken(accessToken);

  if (apiKey) builder.setDeveloperKey(apiKey);

  builder.setCallback((data: any) => {
    if (data.action === window.google.picker.Action.PICKED && data.docs[0]) {
      onPick({ id: data.docs[0].id, name: data.docs[0].name });
    }
  }).build().setVisible(true);
};

// --- Sheet Operations ---

export const extractSheetId = (urlOrId: string): SheetId => {
  const clean = urlOrId.trim();
  const match = clean.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];

  if (!clean.includes('/')) return clean;

  return clean.split(/[/?#&]/).find(seg => seg.length >= 25 && /^[a-zA-Z0-9-_]+$/.test(seg)) || clean;
};

export const fetchGoogleSheetValues = async (
  sheetId: SheetId,
  accessToken: AccessToken
): Promise<SheetRow[]> => {
  const data = await fetchApi<{ values?: [string, string][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:B`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  return (data.values || []).map(r => ({
    key: (r[0] || '').toString(),
    value: (r[1] || '').toString(),
  }));
};

export const createGoogleSheet = async (
  title: string,
  accessToken: AccessToken,
  rows: [string, string][] = []
): Promise<ConnectedSheet> => {
  const data = await fetchApi<{ spreadsheetId: string; spreadsheetUrl: string }>(
    'https://sheets.googleapis.com/v4/spreadsheets',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title: title || 'বংশ ফ্যামিলি গ্রাফ' },
        sheets: [{ properties: { title: 'বংশতালিকা', gridProperties: { columnCount: 2 } } }],
      }),
    }
  );

  if (rows.length > 0) {
    await saveGoogleSheetValues(data.spreadsheetId, accessToken, rows);
  }

  return { id: data.spreadsheetId, name: title || 'বংশ ফ্যামিলি গ্রাফ', url: data.spreadsheetUrl };
};

export const saveGoogleSheetValues = async (
  sheetId: SheetId,
  accessToken: AccessToken,
  rows: [string, string][]
): Promise<void> => {
  // Always clear the existing range first to prevent leftover phantom data
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:B:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  }).catch(() => {});

  // If there are no rows to write, clearing was sufficient. Writing empty values array fails API validation.
  if (rows.length === 0) return;

  await fetchApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows }),
    }
  );
};
