import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  ShieldCheck,
  FolderOpen,
  RefreshCw,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  PlusCircle
} from 'lucide-react';
import {
  getGoogleConfig,
  loadGoogleScripts,
  requestGoogleAccessToken,
  openGoogleDrivePicker,
  fetchGoogleSheetValues,
  createGoogleSheet,
  extractSheetId
} from '../lib/googleAuth';
import { FamilyGraph } from '../types/family';
import { parseKeyValueBlocksToTree, computeRootIds } from '../lib/parser';
import { graphToKeyValueRows } from '../lib/serializer';
import { useLanguage } from '../i18n';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  graph: FamilyGraph;
  onTreeLoaded: (graph: FamilyGraph) => void;
  connectedSheet: { id: string; name: string } | null;
  onSetConnectedSheet: (sheet: { id: string; name: string } | null) => void;
  accessToken: string;
  onSetAccessToken: (token: string) => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  graph,
  onTreeLoaded,
  connectedSheet,
  onSetConnectedSheet,
  accessToken,
  onSetAccessToken,
}) => {
  const { language, t } = useLanguage();
  const [config] = useState(getGoogleConfig());
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

      const clientId = config.clientId;
      if (!clientId) {
        setStatusMessage({
          text: language === 'bn' ? 'গুগল লগইন কনফিগারেশন সেটআপ করা নেই।' : 'Google OAuth Client ID is not configured.',
          type: 'error'
        });
        setLoading(false);
        return;
      }

      const token = await requestGoogleAccessToken(clientId);
      onSetAccessToken(token);
      setStatusMessage({
        text: language === 'bn' ? 'গুগল অ্যাকাউন্টের সাথে সফলভাবে যুক্ত হয়েছে!' : 'Google account connected successfully!',
        type: 'success'
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || (language === 'bn' ? 'গুগল সাইন-ইন ব্যর্থ হয়েছে' : 'Google sign-in failed'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Open Drive Picker
  const handleOpenPicker = () => {
    if (!accessToken) {
      setStatusMessage({
        text: language === 'bn' ? 'প্রথমে গুগল সাইন-ইন করুন' : 'Please sign in with Google first',
        type: 'error'
      });
      return;
    }

    try {
      openGoogleDrivePicker(accessToken, config.apiKey, async (doc) => {
        onSetConnectedSheet({ id: doc.id, name: doc.name });
        await handlePullFromSheet(doc.id, doc.name);
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || (language === 'bn' ? 'ড্রাইভ পিকার খুলতে সমস্যা হয়েছে' : 'Failed to open Drive picker'),
        type: 'error'
      });
    }
  };

  // Create a brand new Google Sheet in Drive
  const handleCreateNewSheet = async () => {
    if (!accessToken) {
      setStatusMessage({
        text: language === 'bn' ? 'প্রথমে গুগল সাইন-ইন করুন' : 'Please sign in with Google first',
        type: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage({
        text: language === 'bn' ? 'আপনার গুগল ড্রাইভে নতুন শিট তৈরি করা হচ্ছে...' : 'Creating new Sheet in your Google Drive...',
        type: 'info'
      });

      const rows = graphToKeyValueRows(graph, language);
      const rootIds = computeRootIds(graph.people);
      const rootPerson = rootIds.length > 0 ? graph.people[rootIds[0]] : null;
      const title = rootPerson
        ? (language === 'bn' ? `${rootPerson.name} এর পরিবার (বংশতালিকা)` : `${rootPerson.name}'s Family Graph`)
        : (language === 'bn' ? 'আমাদের বংশতালিকা গ্রাফ' : 'Our Family Graph');

      const newSheet = await createGoogleSheet(title, accessToken, rows);
      onSetConnectedSheet({ id: newSheet.id, name: newSheet.name });
      setStatusMessage({
        text: language === 'bn'
          ? `গুগল ড্রাইভে "${newSheet.name}" সফলভাবে তৈরি হয়েছে এবং বংশতালিকার তথ্য সেভ হয়েছে!`
          : `"${newSheet.name}" created successfully in Google Drive and saved!`,
        type: 'success'
      });
    } catch (err: any) {
      setStatusMessage({
        text: language === 'bn' ? `শিট তৈরি করতে ব্যর্থ: ${err.message}` : `Failed to create sheet: ${err.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Connect via Sheet URL / ID
  const handleConnectManual = async () => {
    if (!accessToken) {
      setStatusMessage({
        text: language === 'bn' ? 'প্রথমে গুগল সাইন-ইন করুন' : 'Please sign in with Google first',
        type: 'error'
      });
      return;
    }
    const cleanId = extractSheetId(manualSheetInput);
    if (!cleanId) {
      setStatusMessage({
        text: language === 'bn' ? 'অনুগ্রহ করে সঠিক গুগল শিটের লিঙ্ক দিন' : 'Please enter a valid Google Sheet URL or ID',
        type: 'error'
      });
      return;
    }

    onSetConnectedSheet({ id: cleanId, name: 'Family Graph Sheet' });
    setManualSheetInput('');
    await handlePullFromSheet(cleanId, 'Family Graph Sheet');
  };

  // Pull data from connected Sheet
  const handlePullFromSheet = async (sheetId = connectedSheet?.id, sheetName = connectedSheet?.name) => {
    if (!sheetId || !accessToken) return;

    try {
      setLoading(true);
      setStatusMessage({
        text: language === 'bn' ? `${sheetName || 'শিট'} থেকে ডেটা আনা হচ্ছে...` : `Fetching data from ${sheetName || 'Sheet'}...`,
        type: 'info'
      });

      const rows = await fetchGoogleSheetValues(sheetId, accessToken);
      const parsedGraph = parseKeyValueBlocksToTree(rows);
      onTreeLoaded(parsedGraph);

      if (rows.length === 0) {
        setStatusMessage({
          text: language === 'bn'
            ? 'খালি শিট সংযুক্ত করা হয়েছে। বংশতালিকায় সদস্য যোগ করে "শিটে সেভ করুন" চাপুন।'
            : 'Empty sheet connected. Add members to your family graph and save.',
          type: 'success',
        });
      } else {
        setStatusMessage({
          text: language === 'bn'
            ? `সফলভাবে ${rows.length}টি প্রপার্টি লোড করা হয়েছে!`
            : `Successfully loaded ${rows.length} properties!`,
          type: 'success'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        text: language === 'bn' ? `ডেটা লোড করতে ব্যর্থ: ${err.message}` : `Failed to load data: ${err.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Disconnect
  const handleDisconnect = () => {
    onSetAccessToken('');
    onSetConnectedSheet(null);
    setStatusMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-blue-200 shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{t.googleSync.modalTitle}</h2>
              <p className="text-xs text-slate-500">{t.googleSync.modalSubtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">

          {/* Privacy Guarantee Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-900">{t.googleSync.privacyTitle}</span>
              <p className="text-emerald-800 leading-relaxed">
                {t.googleSync.privacyDesc}
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
              <div className="font-bold text-slate-800 text-sm">{t.googleSync.step1Title}</div>
              <p className="text-slate-600 leading-relaxed">
                {t.googleSync.step1Desc}
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
                <span>{t.googleSync.loginButton}</span>
              </button>
            </div>
          ) : (
            /* Connected State */
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-semibold text-emerald-900">{t.googleSync.connectedBadge}</span>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.googleSync.logoutButton}</span>
                </button>
              </div>

              {/* Connected Sheet Card or Sheet Selection */}
              {connectedSheet ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">{t.googleSync.connectedSheetLabel}</span>
                      <h4 className="font-bold text-slate-800 text-sm truncate max-w-[280px]">{connectedSheet.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {connectedSheet.id.slice(0, 16)}...</span>
                    </div>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${connectedSheet.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title={t.googleSync.openSheet}
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
                      <span>{t.googleSync.refreshFromSheet}</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onSetConnectedSheet(null)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-slate-200 transition"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{t.googleSync.chooseAnotherSheet}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Select Sheet */
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="font-bold text-slate-800 text-sm">{t.googleSync.step2Title}</div>

                  {/* 1-Click Create New Sheet in Google Drive */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleCreateNewSheet}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 shadow-sm transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{t.googleSync.createNewSheet}</span>
                  </button>

                  <div className="flex items-center gap-2 my-2 text-slate-400">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-[10px] uppercase font-bold">{t.googleSync.orLinkExisting}</span>
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>

                  {/* Google Drive Picker Button */}
                  <button
                    type="button"
                    onClick={handleOpenPicker}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>{t.googleSync.selectFromDrive}</span>
                  </button>

                  <div className="flex items-center gap-2 my-2 text-slate-400">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-[10px] uppercase font-bold">{t.googleSync.orPasteUrl}</span>
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>

                  {/* Manual Sheet Link Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t.googleSync.urlPlaceholder}
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
                      {t.googleSync.connectButton}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            {t.common.close}
          </button>
        </div>

      </div>
    </div>
  );
};
