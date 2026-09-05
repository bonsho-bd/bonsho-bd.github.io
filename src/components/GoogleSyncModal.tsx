import React from 'react';
import { X, FileSpreadsheet, ExternalLink, ShieldCheck, Copy, Check } from 'lucide-react';
import { SAMPLE_FAMILY_TEXT } from '../lib/sampleData';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPasteModal: () => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  onOpenPasteModal,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(SAMPLE_FAMILY_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">গুগল শিট ব্যবহার করুন</h2>
              <p className="text-xs text-slate-500">আপনার নিজস্ব গুগল শিটে তথ্য রেখে নিরাপদে বংশ দেখুন</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-600">

          {/* Privacy Note */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-emerald-900">১০০% প্রাইভেসি গ্যারান্টি:</span>
              <span>বংশ (Bonsho) আপনার পরিবারের কোনো তথ্য কোনো সার্ভারে সংরক্ষণ করে না। সমস্ত ডেটা কেবল আপনার ব্রাউজার ও আপনার গুগল শিটের মাঝে সীমাবদ্ধ।</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-sm">সহজ ৩টি ধাপ:</h3>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-semibold text-slate-800">ধাপ ১: গুগল শিট খুলুন</div>
              <p>আপনার গুগল ড্রাইভে একটি নতুন গুগল শিট তৈরি করুন।</p>
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
              >
                <span>sheets.new খুলুন</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-semibold text-slate-800">ধাপ ২: সহজ ২ কলামে নাম লিখুন</div>
              <p>কলাম A-তে প্রপার্টির নাম (যেমন: Name, Gender, Wife, Child) এবং কলাম B-তে মান লিখুন। অথবা নিচের বাটন চেপে একটি নমুনা ফরম্যাট কপি করে শিটে পেস্ট করুন:</p>
              <button
                type="button"
                onClick={handleCopyTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copied ? 'নমুনা কপি হয়েছে!' : 'নমুনা ফরম্যাট কপি করুন'}</span>
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-semibold text-slate-800">ধাপ ৩: বংশ-এ দেখুন</div>
              <p>শিটের কলাম দুটি সিলেক্ট করে কপি করুন (Ctrl+C), এরপর এখানে পেস্ট অপশন দিয়ে মুহূর্তেই ট্রি দেখুন!</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPasteModal();
                }}
                className="px-3.5 py-1.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition"
              >
                পেস্ট অপশন খুলুন
              </button>
            </div>
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

