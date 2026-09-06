import React from 'react';
import { TreePine, ClipboardPaste, Upload, Download, Sparkles, FileSpreadsheet, FileText, Search, PlusCircle, AlertCircle, QrCode } from 'lucide-react';
import { isGoogleSyncAvailable } from '../lib/googleAuth';

interface HeaderProps {
  onOpenPasteModal: () => void;
  onOpenUpload: () => void;
  onOpenGoogleModal: () => void;
  onOpenQRCode: () => void;
  onLoadSample: () => void;
  onNewTree: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onExportPoster: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalPeopleCount: number;
  connectedSheet: { id: string; name: string } | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPasteModal,
  onOpenUpload,
  onOpenGoogleModal,
  onOpenQRCode,
  onLoadSample,
  onNewTree,
  onExportExcel,
  onExportCSV,
  onExportPoster,
  searchQuery,
  onSearchChange,
  totalPeopleCount,
  connectedSheet,
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const isGoogleAvailable = isGoogleSyncAvailable();

  return (
    <header className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-30 px-4 py-2.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">

        {/* Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-emerald-200 shadow-md">
            <TreePine className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">বংশ <span className="text-emerald-600 font-medium text-base">Bonsho</span></h1>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                {totalPeopleCount} জন সদস্য
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">প্রাইভেসি-বান্ধব বাংলাদেশী ফ্যামিলি ট্রি ভিজ্যুয়ালাইজার</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-xs min-w-[180px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="আত্মীয় খুঁজুন..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">

          {/* Direct Paste */}
          <button
            onClick={onOpenPasteModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition"
            title="ক্লিপবোর্ডের মাধ্যমে ডেটা কপি বা পেস্ট করুন"
          >
            <ClipboardPaste className="w-4 h-4" />
            <span className="hidden sm:inline">ক্লিপবোর্ড</span>
          </button>

          {/* Upload File */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-200 transition"
            title="CSV বা Excel ফাইল আপলোড করুন"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">আপলোড</span>
          </button>

          {/* Google Sheets Sync */}
          <div className="relative group">
            <button
              onClick={isGoogleAvailable ? onOpenGoogleModal : undefined}
              disabled={!isGoogleAvailable}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
                !isGoogleAvailable
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                  : connectedSheet
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
              }`}
              title={
                !isGoogleAvailable
                  ? 'গুগল শিট সিঙ্ক নিষ্ক্রিয়: Google OAuth টোকেন / Client ID অনুপস্থিত'
                  : 'গুগল শিটের সাথে সরাসরি যুক্ত করুন'
              }
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">
                {connectedSheet ? `শিট: ${connectedSheet.name.slice(0, 10)}...` : 'গুগল শিট'}
              </span>
              {connectedSheet && <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>}
            </button>

            {/* Error Tooltip when Google OAuth is not present */}
            {!isGoogleAvailable && (
              <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center z-50 w-72 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mb-1 hidden sm:block"></div>
                <div className="bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl border border-slate-700 text-left space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>গুগল শিট সিঙ্ক নিষ্ক্রিয়</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Google OAuth Token / Client ID কনফিগার করা নেই। অনুগ্রহ করে <strong>পেস্ট করুন</strong> বা <strong>আপলোড</strong> বিকল্পটি ব্যবহার করুন।
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Load Sample Family */}
          <button
            onClick={onLoadSample}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition"
            title="নমুনা পরিবার দেখুন"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="hidden lg:inline">নমুনা</span>
          </button>

          {/* Start New / Blank */}
          <button
            onClick={onNewTree}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            title="নতুন খালি ট্রি শুরু করুন"
          >
            <PlusCircle className="w-4 h-4 text-slate-500" />
            <span className="hidden lg:inline">নতুন</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900 shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>ডাউনলোড</span>
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-sm"
                onClick={() => setShowExportMenu(false)}
              >
                <button
                  onClick={onExportExcel}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>এক্সেল ফাইল (.xlsx)</span>
                </button>
                <button
                  onClick={onExportCSV}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>CSV ফাইল (.csv)</span>
                </button>
                <button
                  onClick={onExportPoster}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-t border-slate-100"
                >
                  <TreePine className="w-4 h-4 text-purple-600" />
                  <span>পোস্টার ছবি (PNG)</span>
                </button>
                <button
                  onClick={onOpenQRCode}
                  className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center gap-2 text-emerald-700 border-t border-slate-100 font-medium"
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>QR কোড শেয়ার</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};

