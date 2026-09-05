import React, { useState } from 'react';
import { X, ClipboardPaste, Check, HelpCircle } from 'lucide-react';
import { parseRawTextToRows } from '../lib/parser';

interface PasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParseText: (text: string) => void;
}

export const PasteModal: React.FC<PasteModalProps> = ({ isOpen, onClose, onParseText }) => {
  const [text, setText] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  if (!isOpen) return null;

  const rows = text.trim() ? parseRawTextToRows(text) : [];
  const validRowCount = rows.filter(r => r.key && r.value).length;

  const handleApply = () => {
    if (!text.trim()) return;
    onParseText(text);
    onClose();
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(clipText);
      }
    } catch {
      // Fallback for browsers with strict permissions
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">সরাসরি ডেটা পেস্ট করুন</h2>
              <p className="text-xs text-slate-500">গুগল শিট বা এক্সেল থেকে কপি করা ২ কলামের ডেটা এখানে দিন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{validRowCount} টি প্রপার্টি শনাক্ত হয়েছে</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>ক্লিপবোর্ড থেকে পেস্ট করুন</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>ফরম্যাট কেমন হবে?</span>
              </button>
            </div>
          </div>

          {/* Help Accordion */}
          {showHelp && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-2">
              <div className="font-semibold text-emerald-900">২ কলামের সহজ ফরম্যাট (বাংলা বা ইংরেজি উভয়ই চলবে):</div>
              <pre className="bg-white/80 p-2.5 rounded border border-emerald-100 font-mono text-[11px] overflow-x-auto">
{`নাম, আক্কাস আলী
লিঙ্গ, পুরুষ
জন্ম, 1935
মৃত্যু, 2012
গ্রাম, রামপুর, চাঁদপুর
স্ত্রী, সালেহা বেগম
সন্তান, মতিউর রহমান
সন্তান, রোকসানা আক্তার

নাম, মতিউর রহমান
স্ত্রী, নাজনীন আক্তার
সন্তান, নাদিম রহমান`}
              </pre>
              <p className="text-emerald-800">
                💡 প্রতিটি ব্যক্তির তথ্যের মাঝে একটি ফাঁকা লাইন রাখুন। স্ত্রী/স্বামীর ঠিক নিচে সন্তানের নাম দিলে তারা স্বয়ংক্রিয়ভাবে সেই দম্পতির সন্তান হিসেবে যুক্ত হবে।
              </p>
            </div>
          )}

          {/* Text Area */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`এখানে গুগল শিট বা এক্সেল থেকে কপি করে পেস্ট করুন...\n\nউদাহরণ:\nName\tআক্কাস আলী\nGender\tMale\nBirth\t1940\nWife\tসালেহা বেগম\nChild\tমতিউর রহমান`}
            rows={12}
            className="w-full p-3.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            বাতিল
          </button>
          <button
            onClick={handleApply}
            disabled={!text.trim()}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
          >
            <Check className="w-4 h-4" />
            <span>ট্রি তৈরি করুন</span>
          </button>
        </div>

      </div>
    </div>
  );
};

