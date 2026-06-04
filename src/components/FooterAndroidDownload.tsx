import React from 'react';
import { Download } from 'lucide-react';
import { startAndroidAppInstall } from '../lib/androidAppDownload';
import { useSystemConfig } from '../lib/SystemConfigContext';
import { useLanguage } from '../lib/LanguageContext';
import { toast } from 'react-hot-toast';

type Props = {
  appName?: string;
  compact?: boolean;
};

function AndroidMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M17.6 9.48l1.84-3.18c.16-.28.06-.62-.26-.74-.28-.1-.62 0-.74.26l-1.87 3.24a7.96 7.96 0 0 0-8.14 0L5.65 5.82c-.12-.26-.46-.36-.74-.26-.32.12-.42.46-.26.74L6.4 9.48A8.01 8.01 0 0 0 4 14.5h16a8.01 8.01 0 0 0-2.4-5.02zM8.5 13.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm7 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}

/** Footer — direct link; one tap starts APK download */
export function FooterAndroidDownload({ appName = 'SchoolixiQ', compact = false }: Props) {
  const { config } = useSystemConfig();
  const { t, isRtl } = useLanguage();

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    startAndroidAppInstall({ configUrl: config.androidApkUrl, isRtl });
    toast.success(t('androidAppDownloadStarted'));
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleDownload}
        className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-[#0B2345]/15 bg-white/80 dark:bg-slate-900/80 hover:border-[#3DDC84]/50 hover:bg-gradient-to-r hover:from-[#0B2345]/5 hover:to-[#3DDC84]/10 hover:shadow-md transition-all duration-300 active:scale-[0.98]"
        aria-label={`تحميل تطبيق ${appName} للأندرويد`}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3DDC84]/15 text-[#2da05a] group-hover:bg-[#3DDC84] group-hover:text-white transition-colors">
          <AndroidMark className="w-5 h-5" />
        </span>
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
          تحميل تطبيق {appName} للأندرويد
        </span>
        <Download size={14} className="text-slate-400 shrink-0" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="group relative flex flex-col sm:flex-row items-center gap-4 sm:gap-5 w-full max-w-md mx-auto px-5 py-4 sm:px-6 sm:py-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 overflow-hidden transition-all duration-300 hover:border-[#3DDC84]/40 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99] text-start"
      aria-label={`تحميل تطبيق ${appName} للأندرويد`}
    >
      <span className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0B2345] to-[#1a3a6b] text-white shadow-lg">
        <AndroidMark className="w-8 h-8 sm:w-9 sm:h-9 text-[#3DDC84]" />
      </span>
      <span className="relative flex-1 text-center sm:text-start min-w-0">
        <span className="block text-sm sm:text-base font-black text-slate-900 dark:text-white">
          تحميل تطبيق {appName} للأندرويد
        </span>
        <span className="block text-[11px] sm:text-xs font-medium text-slate-500 mt-1">
          إشعارات فورية • تجربة أسرع على الهاتف
        </span>
      </span>
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0B2345]">
        <Download size={18} />
      </span>
    </button>
  );
}

export default FooterAndroidDownload;
