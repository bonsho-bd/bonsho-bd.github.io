import React, { useState, useEffect } from 'react';
import { X, Table2, Check, HelpCircle, Copy, CheckCheck, AlertCircle } from 'lucide-react';
import { parseRawTextToRows } from '../lib/parser';
import { graphToCSV } from '../lib/serializer';
import { FamilyGraph } from '../types/family';
import { useLanguage } from '../i18n';

interface PasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParseText: (text: string) => boolean;
  graph: FamilyGraph;
}

export const PasteModal: React.FC<PasteModalProps> = ({ isOpen, onClose, onParseText, graph }) => {
  const { language, t } = useLanguage();
  const [text, setText] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setText(graphToCSV(graph, language));
      setCopied(false);
      setErrorMessage(null);
    }
  }, [isOpen, graph, language]);

  if (!isOpen) return null;

  const rows = text.trim() ? parseRawTextToRows(text) : [];
  const validRowCount = rows.filter(r => r.key && r.value).length;

  const handleApply = () => {
    const success = onParseText(text);
    if (success) {
      setErrorMessage(null);
      onClose();
    } else {
      setErrorMessage(t.pasteModal.parseError);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Table2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{t.pasteModal.title}</h2>
              <p className="text-xs text-slate-500">{t.pasteModal.subtitle}</p>
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
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{t.pasteModal.propertiesDetected(validRowCount)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-blue-700 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 transition"
              >
                {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t.pasteModal.copied : t.pasteModal.copyAll}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 ml-2"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{t.pasteModal.formatHelp}</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Help Accordion */}
          {showHelp && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-2">
              <div className="font-semibold text-emerald-900">{t.pasteModal.formatHelpTitle}</div>
              <pre className="bg-white/80 p-2.5 rounded border border-emerald-100 font-mono text-[11px] overflow-x-auto">
{language === 'bn' ? `নাম, আক্কাস আলী
লিঙ্গ, পুরুষ
জন্ম, ১৯৭৮
স্ত্রী, সালেহা বেগম
সন্তান, মতিউর রহমান

নাম, সালেহা বেগম
লিঙ্গ, নারী
জন্ম, ১৯৮২` : `Name, Akkas Ali
Gender, Male
Birth, 1978
Wife, Saleha Begum
Child, Motiur Rahman

Name, Saleha Begum
Gender, Female
Birth, 1982`}
              </pre>
              <div className="space-y-1 text-emerald-800 text-[11px]">
                <p>💡 {t.pasteModal.formatHelpLine1}</p>
                <p>💡 {t.pasteModal.formatHelpLine2}</p>
                <p>💡 {t.pasteModal.formatHelpLine3}</p>
                <p>💡 {t.pasteModal.formatHelpLine4}</p>
              </div>
            </div>
          )}

          {/* Text Area */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              language === 'bn'
                ? `এখানে গুগল শিট বা এক্সেল থেকে কপি করে পেস্ট করুন...\n\nউদাহরণ:\nনাম\tআক্কাস আলী\nলিঙ্গ\tপুরুষ\nজন্ম\t১৯৭৮\nস্ত্রী\tসালেহা বেগম\nসন্তান\tমতিউর রহমান`
                : `Paste copied table from Excel or Google Sheets here...\n\nExample:\nName\tAkkas Ali\nGender\tMale\nBirth\t1978\nWife\tSaleha Begum\nChild\tMotiur Rahman`
            }
            rows={12}
            className="w-full p-3.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition whitespace-pre flex-nowrap overflow-auto"
          />

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition"
          >
            <Check className="w-4 h-4" />
            <span>{t.pasteModal.applyButton}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
