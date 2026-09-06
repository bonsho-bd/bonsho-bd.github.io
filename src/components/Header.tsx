import React, { useState, useRef, useEffect } from 'react';
import {
  TreePine, ClipboardPaste, Sparkles,
  FileSpreadsheet, Search, PlusCircle,
  QrCode, Share2, Copy, ChevronDown, Camera
} from 'lucide-react';
import { isGoogleSyncAvailable } from '../lib/googleAuth';

interface HeaderProps {
  onOpenPasteModal: () => void;
  onOpenGoogleModal: () => void;
  onOpenQRCode: () => void;
  onLoadSample: () => void;
  onNewTree: () => void;
  onExportFullTree: () => void;
  onExportViewport: () => void;
  onCopyToClipboard?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalPeopleCount: number;
  connectedSheet: { id: string; name: string } | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPasteModal,
  onOpenGoogleModal,
  onOpenQRCode,
  onLoadSample,
  onNewTree,
  onExportFullTree,
  onExportViewport,
  onCopyToClipboard,
  searchQuery,
  onSearchChange,
  totalPeopleCount,
  connectedSheet,
}) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const isGoogleAvailable = isGoogleSyncAvailable();

  // Close menus on outside click
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <header ref={headerRef} className="bg-white/90 backdrop-blur border-b border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm z-40 shrink-0">
      <div className="max-w-screen-2xl mx-auto flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">

        {/* Top Row: Logo & Search */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <img src="/graph-icon.svg" alt="Bonsho Logo" className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-none">বংশ</h1>
                <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full">
                  {totalPeopleCount} জন সদস্য
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">প্রাইভেসি-বান্ধব বাংলাদেশী ফ্যামিলি গ্রাফ</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full lg:flex-1 lg:max-w-md shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="আত্মীয় খুঁজুন..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 sm:py-1.5 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition shadow-inner"
          />
        </div>

        {/* Action Buttons (Just Sync and Share) */}
        <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto shrink-0 ml-auto justify-start lg:justify-end">

          {/* Start New / Blank */}
          <button
            onClick={onNewTree}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition whitespace-nowrap"
            title="নতুন খালি গ্রাফ শুরু করুন"
          >
            <PlusCircle className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">নতুন গ্রাফ</span>
          </button>

          {/* Load Sample Family */}
          <button
            onClick={onLoadSample}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg shadow-sm transition whitespace-nowrap"
            title="নমুনা গ্রাফ লোড করুন"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">নমুনা গ্রাফ</span>
          </button>

          {/* Paste Data Button */}
          <button
            onClick={onOpenPasteModal}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 shadow-sm transition whitespace-nowrap"
            title="ক্লিপবোর্ড থেকে টেক্সট পেস্ট করুন"
          >
            <ClipboardPaste className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">পেস্ট ডেটা</span>
          </button>

          {/* Google Sheets Sync Button */}
          <div className="relative group">
            <button
              onClick={() => {
                if (isGoogleAvailable) {
                  onOpenGoogleModal();
                }
              }}
              disabled={!isGoogleAvailable}
              className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm font-medium border rounded-lg shadow-sm transition whitespace-nowrap ${
                !isGoogleAvailable
                  ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200'
                  : connectedSheet
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
              title={isGoogleAvailable ? "গুগল শিটের সাথে সিঙ্ক করুন" : "Google OAuth টোকেন অনুপস্থিত"}
            >
              <FileSpreadsheet className={`w-4 h-4 ${connectedSheet ? 'text-emerald-600' : 'text-emerald-600'}`} />
              <span className="hidden sm:inline">গুগল শিট</span>
              {connectedSheet && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1"></span>}
            </button>
            {!isGoogleAvailable && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block w-48 bg-slate-800 text-white text-[11px] p-2 rounded shadow-lg z-50 before:content-[''] before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
                Google OAuth টোকেন / Client ID অনুপস্থিত।
              </div>
            )}
          </div>

          {/* Share Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900 shadow-sm transition whitespace-nowrap"
            >
              <Share2 className="w-4 h-4" />
              <span>শেয়ার</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showShareMenu ? 'rotate-180' : ''}`} />
            </button>

            {showShareMenu && (
              <div
                className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-sm"
              >
                <button
                  onClick={() => { onOpenQRCode(); setShowShareMenu(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center gap-2 text-emerald-700 font-medium bg-emerald-50/50"
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>QR কোড ও লিংক</span>
                </button>

                <div className="h-px bg-slate-100 my-1"></div>

                <button
                  disabled={totalPeopleCount === 0}
                  onClick={() => { onExportFullTree(); setShowShareMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>সম্পূর্ণ গ্রাফ ছবি হিসেবে সেভ করুন</span>
                </button>
                <button
                  disabled={totalPeopleCount === 0}
                  onClick={() => { onExportViewport(); setShowShareMenu(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-slate-700 transition-colors"
                >
                  <TreePine className="w-4 h-4 text-purple-600" />
                  <span>ডাউনলোড ইমেজ (PNG)</span>
                </button>

                {onCopyToClipboard && (
                  <button
                    disabled={totalPeopleCount === 0}
                    onClick={() => { onCopyToClipboard(); setShowShareMenu(false); }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-slate-700 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>ক্লিপবোর্ডে কপি করুন</span>
                  </button>
                )}


              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
