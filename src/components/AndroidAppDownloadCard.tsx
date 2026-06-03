import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { BRAND_LOGO_URL } from '../lib/resolveBrandLogo';
import {
  dismissAndroidApkPrompt,
  shouldPromoteAndroidApp,
  triggerAndroidApkDownload,
} from '../lib/androidAppDownload';
import { toast } from 'react-hot-toast';

type Props = {
  className?: string;
};

/** Compact Android APK promo on login / signup (mobile web only). */
export default function AndroidAppDownloadCard({ className = '' }: Props) {
  const { t, isRtl } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  if (!shouldPromoteAndroidApp() || dismissed) return null;

  const handleDownload = () => {
    triggerAndroidApkDownload();
    toast.success(t('androidAppDownloadStarted'), { duration: 5000 });
    toast(t('androidAppDownloadHint'), {
      icon: '📲',
      duration: 8000,
      style: { maxWidth: '360px' },
    });
  };

  const handleDismiss = () => {
    dismissAndroidApkPrompt();
    setDismissed(true);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#0B2345]/15 bg-gradient-to-br from-slate-50 via-white to-amber-50/40 p-3.5 sm:p-4 shadow-sm ${className}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0B2345] via-indigo-600 to-[#D4A64A]" />
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-2.5 end-2.5 p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        aria-label={t('closeNotification')}
      >
        <X size={14} />
      </button>

      <div className="flex items-center gap-3 pe-6">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-xl bg-[#0B2345] flex items-center justify-center shadow-md shadow-indigo-900/20">
            <img
              src={BRAND_LOGO_URL}
              alt=""
              className="w-8 h-8 object-contain"
              aria-hidden
            />
          </div>
          <span className="absolute -bottom-1 -end-1 w-5 h-5 rounded-full bg-[#3DDC84] border-2 border-white flex items-center justify-center">
            <Smartphone size={10} className="text-white" />
          </span>
        </div>

        <div className="flex-1 min-w-0 text-start">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#0B2345]/80 mb-0.5">
            Android
          </p>
          <p className="text-sm font-black text-slate-900 leading-tight">
            {t('androidAppDownloadTitle')}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2">
            {t('androidAppDownloadDesc')}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="mt-3 w-full py-2.5 rounded-xl bg-[#0B2345] hover:bg-[#1a3a6b] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-900/15 active:scale-[0.98] transition-all"
      >
        <Download size={16} />
        {t('androidAppDownloadBtn')}
      </button>
    </div>
  );
}
