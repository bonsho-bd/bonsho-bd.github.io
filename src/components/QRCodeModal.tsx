import React, { useState, useEffect } from 'react';
import { X, QrCode, Download, Copy, Check, Share2, Camera, Printer, Link as LinkIcon, Sparkles, MessageCircle } from 'lucide-react';
import { FamilyGraph } from '../types/family';
import { generateQRUrlForTree, generateQRCodeWithLogo } from '../lib/qrCodec';
import { useLanguage } from '../i18n';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  graph: FamilyGraph;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, graph }) => {
  const { language, t } = useLanguage();
  const [qrUrl, setQrUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [stats, setStats] = useState<{ rawBytes: number; compressedBytes: number }>({
    rawBytes: 0,
    compressedBytes: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setCopied(false);

    try {
      const { url, rawByteCount, compressedByteCount } = generateQRUrlForTree(graph);
      setQrUrl(url);
      setStats({ rawBytes: rawByteCount, compressedBytes: compressedByteCount });

      // Generate QR code data URL with logo
      generateQRCodeWithLogo(url)
        .then((dataUrl) => {
          if (!isMounted) return;
          setQrDataUrl(dataUrl);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('QRCode.toDataURL error:', err);
          if (isMounted) setIsLoading(false);
        });
    } catch (err) {
      console.error('Failed to generate QR code URL:', err);
      if (isMounted) setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, graph]);

  if (!isOpen) return null;

  const peopleCount = Object.keys(graph.people).length;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadImage = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = 'bonsho-family-graph-qr.png';
    link.href = qrDataUrl;
    link.click();
  };

  const handleWhatsAppShare = () => {
    if (!qrUrl) return;
    const text = encodeURIComponent(t.app.whatsAppShareMessage(peopleCount, qrUrl));
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.common.appName,
          text: t.app.whatsAppShareMessage(peopleCount, qrUrl),
          url: qrUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{t.qrModal.title}</h2>
              <p className="text-xs text-slate-500">{t.qrModal.subtitle}</p>
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
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-center">

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center">
            <div className="p-3 bg-white border-2 border-slate-200/80 rounded-2xl shadow-md inline-block">
              {isLoading ? (
                <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs">{language === 'bn' ? 'কিউআর কোড তৈরি হচ্ছে...' : 'Generating QR Code...'}</span>
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Family Graph QR Code"
                  className="w-56 h-56 rounded-lg select-none"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-rose-500">
                  {language === 'bn' ? 'কিউআর কোড তৈরি করতে সমস্যা হয়েছে' : 'Failed to generate QR Code'}
                </div>
              )}
            </div>

            {/* Stats Badge */}
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {t.qrModal.peopleCountLabel(peopleCount)}
              </span>
              <span>•</span>
              <span className="text-slate-400">
                {t.qrModal.sizeLabel(stats.compressedBytes)}
              </span>
            </div>
          </div>

          {/* Sharing Guidance Prompt */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-left text-xs text-emerald-950 space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{language === 'bn' ? 'আত্মীয়দের সাথে কীভাবে শেয়ার করবেন?' : 'How to share with relatives?'}</span>
            </div>
            <ul className="space-y-1 text-slate-600 text-[11px] pl-1">
              <li className="flex items-center gap-1.5">
                <Camera className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>
                  {language === 'bn'
                    ? <><strong>স্ক্রিনশট নিন</strong> বা ইমেজটি ডাউনলোড করে পরিবারকে পাঠান।</>
                    : <><strong>Take a screenshot</strong> or download the image and send to family.</>}
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                <Printer className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>
                  {language === 'bn'
                    ? <>ফ্যামিলি পোস্টার বা অ্যালবামে <strong>প্রিন্ট করে</strong> লাগিয়ে রাখতে পারেন।</>
                    : <><strong>Print it</strong> on family posters or memory albums.</>}
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>
                  {language === 'bn'
                    ? <>যেকোনো স্মার্টফোন ক্যামেরা দিয়ে স্ক্যান করলেই সরাসরি খুলে যাবে।</>
                    : <>Scan with any smartphone camera to open directly.</>}
                </span>
              </li>
            </ul>
          </div>

          {/* URL Display Box */}
          <div className="space-y-1 text-left">
            <label className="block text-[11px] font-semibold text-slate-600">
              {language === 'bn' ? 'কিউআর কোডের লিঙ্ক (URL):' : 'QR Code Link (URL):'}
            </label>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
              <input
                type="text"
                readOnly
                value={qrUrl}
                className="w-full bg-transparent px-2 py-1 text-[11px] font-mono text-slate-700 focus:outline-none select-all truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition shadow-2xs"
                title={t.qrModal.copyLink}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? t.qrModal.copied : t.qrModal.copyLink}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition"
              title={t.qrModal.shareWhatsApp}
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator ? (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{t.qrModal.shareNative}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? t.qrModal.copied : t.qrModal.copyLink}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
            >
              {t.common.close}
            </button>
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={!qrDataUrl}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.qrModal.downloadImage}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
