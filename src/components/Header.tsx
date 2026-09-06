import React, { useState, useRef, useEffect } from 'react';
import { 
  TreePine, ClipboardPaste, Upload, Sparkles, 
  FileSpreadsheet, FileText, Search, PlusCircle,  
  QrCode, Share2, Database, Copy, ChevronDown
} from 'lucide-react';
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
  onCopyToClipboard?: () => void;
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
  onCopyToClipboard,
  searchQuery,
  onSearchChange,
  totalPeopleCount,
  connectedSheet,
}) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const isGoogleAvailable = isGoogleSyncAvailable();

  // Close menus on outside click
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
        setShowSyncMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header ref={headerRef} className="bg-white/90 backdrop-blur border-b border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm z-40 shrink-0">
      <div className="max-w-screen-2xl mx-auto flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
        
        {/* Top Row: Logo & Search */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <img src="/tree-icon.svg" alt="Bonsho Logo" className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-none">বংশ</h1>
                <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full">
                  {totalPeopleCount} জন সদস্য
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">প্রাইভেসি-বান্ধব বাংলাদেশী ফ্যামিলি ট্রি</p>
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
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 lg:pb-0 lg:mx-0 lg:px-0 scrollbar-hide w-full lg:w-auto shrink-0 ml-auto justify-start lg:justify-end">

          {/* Start New / Blank */}
          <button
            onClick={onNewTree}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition whitespace-nowrap"
            title="নতুন খালি ট্রি শুরু করুন"
          >
            <PlusCircle className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">নতুন ট্রি</span>
          </button>

          {/* Load Sample Family */}
          <button
            onClick={onLoadSample}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg shadow-sm transition whitespace-nowrap"
            title="নমুনা ট্রি লোড করুন"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">নমুনা ট্রি</span>
          </button>

          {/* Sync & Data Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSyncMenu(!showSyncMenu);
                setShowShareMenu(false);
              }}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 shadow-sm transition whitespace-nowrap"
            >
              <Database className="w-4 h-4" />
              <span>সিঙ্ক ও ডেটা</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSyncMenu ? 'rotate-180' : ''}`} />
            </button>

            {showSyncMenu && (
              <div className="absolute right-0 lg:right-auto lg:left-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-sm">
                


                <div className="relative group">
                  <button
                    onClick={() => {
                      if (isGoogleAvailable) {
                        onOpenGoogleModal();
                        setShowSyncMenu(false);
                      }
                    }}
                    disabled={!isGoogleAvailable}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between group ${
                      !isGoogleAvailable ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-slate-700">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>গুগল শিট</span>
                    </div>
                    {connectedSheet && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                  </button>
                  {!isGoogleAvailable && (
                    <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-48 bg-slate-800 text-white text-[11px] p-2 rounded shadow-lg z-50">
                      Google OAuth টোকেন / Client ID অনুপস্থিত।
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { onOpenPasteModal(); setShowSyncMenu(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <ClipboardPaste className="w-4 h-4 text-blue-500" />
                  <span>ক্লিপবোর্ড থেকে পেস্ট</span>
                </button>

                <button
                  onClick={() => { onOpenUpload(); setShowSyncMenu(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>আপলোড (CSV/Excel)</span>
                </button>
              </div>
            )}
          </div>

          {/* Share Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowShareMenu(!showShareMenu);
                setShowSyncMenu(false);
              }}
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
                  onClick={() => { onExportPoster(); setShowShareMenu(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <TreePine className="w-4 h-4 text-purple-600" />
                  <span>ডাউনলোড ইমেজ (PNG)</span>
                </button>
                
                {onCopyToClipboard && (
                  <button
                    onClick={() => { onCopyToClipboard(); setShowShareMenu(false); }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>ক্লিপবোর্ডে কপি করুন</span>
                  </button>
                )}

                <div className="h-px bg-slate-100 my-1"></div>

                <button
                  onClick={() => { onExportExcel(); setShowShareMenu(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>ডাউনলোড .xlsx</span>
                </button>
                <button
                  onClick={() => { onExportCSV(); setShowShareMenu(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>ডাউনলোড .csv</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
