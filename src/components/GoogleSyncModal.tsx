import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  ShieldCheck, 
  FolderOpen, 
  RefreshCw, 
  Save, 
  LogOut, 
  Key, 
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  getGoogleConfig, 
  saveGoogleConfig, 
  loadGoogleScripts, 
  requestGoogleAccessToken, 
  openGoogleDrivePicker,
  fetchGoogleSheetValues,
  saveGoogleSheetValues,
  extractSheetId
} from '../lib/googleAuth';
import { FamilyTree } from '../types/family';
import { parseKeyValueBlocksToTree } from '../lib/parser';
import { treeToKeyValueRows } from '../lib/serializer';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: FamilyTree;
  onTreeLoaded: (tree: FamilyTree) => void;
  connectedSheet: { id: string; name: string } | null;
  onSetConnectedSheet: (sheet: { id: string; name: string } | null) => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  tree,
  onTreeLoaded,
  connectedSheet,
  onSetConnectedSheet,
}) => {
  const [accessToken, setAccessToken] = useState<string>('');
  const [config, setConfig] = useState(getGoogleConfig());
  const [showConfig, setShowConfig] = useState(false);
  const [manualSheetInput, setManualSheetInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadGoogleScripts().catch(err => console.error('Failed to load Google scripts:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setStatusMessage(null);
      
      const clientId = config.clientId || prompt('অনুগ্রহ করে আপনার Google OAuth Client ID দিন:');
      if (!clientId) {
        setLoading(false);
        return;
      }

      if (!config.clientId) {
        saveGoogleConfig(clientId, config.apiKey);
        setConfig(prev => ({ ...prev, clientId }));
      }

      const token = await requestGoogleAccessToken(clientId);
      setAccessToken(token);
      setStatusMessage({ text: 'গুগল একাউন্টের সাথে সফলভাবে যুক্ত হয়েছে!', type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'গুগল সাইন-ইন ব্যর্থ হয়েছে', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Open Drive Picker
  const handleOpenPicker = () => {
    if (!accessToken) {
      alert('প্রথমে গুগল সাইন-ইন করুন');
      return;
    }

    try {
      openGoogleDrivePicker(accessToken, config.apiKey, async (doc) => {
        onSetConnectedSheet({ id: doc.id, name: doc.name });
        await handlePullFromSheet(doc.id, doc.name);
      });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'ড্রাইভ পিকার খুলতে সমস্যা হয়েছে', type: 'error' });
    }
  };

  // Connect via Sheet URL / ID
  const handleConnectManual = async () => {
    if (!accessToken) {
      alert('প্রথমে গুগল সাইন-ইন করুন');
      return;
    }
    const cleanId = extractSheetId(manualSheetInput);
    if (!cleanId) return;

    onSetConnectedSheet({ id: cleanId, name: 'Private Google Sheet' });
    await handlePullFromSheet(cleanId, 'Private Google Sheet');
    setManualSheetInput('');
  };

  // Pull data from connected Sheet
  const handlePullFromSheet = async (sheetId = connectedSheet?.id, sheetName = connectedSheet?.name) => {
    if (!sheetId || !accessToken) return;

    try {
      setLoading(true);
      setStatusMessage({ text: `${sheetName || 'শিট'} থেকে ডেটা আনা হচ্ছে...`, type: 'info' });

      const rows = await fetchGoogleSheetValues(sheetId, accessToken);
      const parsedTree = parseKeyValueBlocksToTree(rows);
      onTreeLoaded(parsedTree);

      setStatusMessage({ text: `সফলভাবে ${rows.length}টি প্রপার্টি লোড করা হয়েছে!`, type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: `ডেটা লোড করতে ব্যর্থ: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Push / Save in-app edits back to the Sheet
  const handlePushToSheet = async () => {
    if (!connectedSheet?.id || !accessToken) return;

    try {
      setLoading(true);
      setStatusMessage({ text: 'আপনার গুগল শিটে পরিবর্তনগুলো সংরক্ষণ করা হচ্ছে...', type: 'info' });

      const rows = treeToKeyValueRows(tree);
      await saveGoogleSheetValues(connectedSheet.id, accessToken, rows);

      setStatusMessage({ text: 'আপনার গুগল শিটে সফলভাবে সেভ হয়েছে!', type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: `সেভ করতে ব্যর্থ: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Disconnect
  const handleDisconnect = () => {
    setAccessToken('');
    onSetConnectedSheet(null);
    setStatusMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-blue-200 shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">গুগল শিট কানেক্টর (Method 2)</h2>
              <p className="text-xs text-slate-500">১০০% প্রাইভেট শিটে দ্বি-মুখী সিঙ্ক (Read & Write)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Privacy Guarantee Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-900">জিরো সার্ভার ট্রানজিট:</span>
              <p className="text-emerald-800 leading-relaxed">
                OAuth টোকেনটি কেবল আপনার এই ব্রাউজার ট্যাবেই থাকে। আপনার প্রাইভেট গুগল শিট ও ব্রাউজারের মাঝেই ডেটা সরাসরি আদান-প্রদান হয়।
              </p>
            </div>
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${
              statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              statusMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
              'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> :
               statusMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> :
               <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* Step 1: Google Authentication */}
          {!accessToken ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="font-bold text-slate-800 text-sm">ধাপ ১: গুগলে সাইন-ইন করুন</div>
              <p className="text-slate-600 leading-relaxed">
                আপনার প্রাইভেট শিটটি অ্যাক্সেস ও সংরক্ষণ করার জন্য গুগল অথোরাইজেশন প্রয়োজন।
              </p>
              
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-xs transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google দিয়ে সাইন-ইন করুন</span>
              </button>
            </div>
          ) : (
            /* Connected State */
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-semibold text-emerald-900">গুগল একাউন্ট সংযুক্ত আছে</span>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>লগআউট</span>
                </button>
              </div>

              {/* Connected Sheet Card or Sheet Selection */}
              {connectedSheet ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">বর্তমান শিট</span>
                      <h4 className="font-bold text-slate-800 text-sm truncate max-w-[280px]">{connectedSheet.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {connectedSheet.id.slice(0, 16)}...</span>
                    </div>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${connectedSheet.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="গুগল শিট খুলুন"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Two-Way Sync Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handlePullFromSheet()}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>শিট থেকে রিফ্রেশ</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handlePushToSheet}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 shadow-sm transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>শিটে সেভ করুন</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Select Sheet */
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="font-bold text-slate-800 text-sm">ধাপ ২: আপনার ফ্যামিলি ট্রি শিট নির্বাচন করুন</div>
                  
                  {/* Google Drive Picker Button */}
                  <button
                    type="button"
                    onClick={handleOpenPicker}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Google Drive থেকে শিট বাছুন</span>
                  </button>

                  <div className="flex items-center gap-2 my-2 text-slate-400">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-[10px] uppercase font-bold">অথবা লিঙ্ক দিন</span>
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>

                  {/* Manual Sheet Link Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="শিটের URL বা ID পেস্ট করুন"
                      value={manualSheetInput}
                      onChange={(e) => setManualSheetInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={!manualSheetInput.trim()}
                      onClick={handleConnectManual}
                      className="px-3 py-1.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 disabled:opacity-40"
                    >
                      কানেক্ট
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configuration Settings Accordion */}
          <div className="border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 font-medium"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Google API কনফিগারেশন {showConfig ? 'লুকান' : 'দেখুন'}</span>
            </button>

            {showConfig && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Google OAuth Client ID</label>
                  <input
                    type="text"
                    value={config.clientId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setConfig(prev => ({ ...prev, clientId: newId }));
                      saveGoogleConfig(newId, config.apiKey);
                    }}
                    placeholder="xxxx.apps.googleusercontent.com"
                    className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Google Developer API Key (Drive Picker-এর জন্য)</label>
                  <input
                    type="text"
                    value={config.apiKey}
                    onChange={(e) => {
                      const newKey = e.target.value;
                      setConfig(prev => ({ ...prev, apiKey: newKey }));
                      saveGoogleConfig(config.clientId, newKey);
                    }}
                    placeholder="AIzaSy..."
                    className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Google Cloud Console-এ গিয়ে একটি OAuth 2.0 Web Client তৈরি করুন এবং Authorized JavaScript Origin-এ <code className="text-slate-600">https://bonsho-bd.github.io</code> যুক্ত করুন।
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
