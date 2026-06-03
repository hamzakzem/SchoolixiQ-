import React from 'react';
import { Download } from 'lucide-react';
import { getAndroidApkDownloadUrl } from '../lib/androidAppDownload';
import { useSystemConfig } from '../lib/SystemConfigContext';

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

/** Footer CTA — direct APK download link */
export function FooterAndroidDownload({ appName = 'SchoolixiQ', compact = false }: Props) {
  const { config } = useSystemConfig();
  const downloadUrl = config.androidApkUrl?.trim() || getAndroidApkDownloadUrl();

  if (compact) {
    return (
      <a
        href={downloadUrl}
        download="schoolixiq.apk"
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-[#0B2345]/15 bg-white/80 dark:bg-slate-900/80 hover:border-[#3DDC84]/50 hover:bg-gradient-to-r hover:from-[#0B2345]/5 hover:to-[#3DDC84]/10 hover:shadow-md hover:shadow-emerald-500/10 transition-all duration-300 active:scale-[0.98]"
        aria-label={`تحميل تطبيق ${appName} للأندرويد`}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3DDC84]/15 text-[#2da05a] group-hover:bg-[#3DDC84] group-hover:text-white transition-colors duration-300">
          <AndroidMark className="w-5 h-5" />
        </span>
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-[#0B2345] dark:group-hover:text-white transition-colors">
          تحميل تطبيق {appName} للأندرويد
        </span>
        <Download
          size={14}
          className="text-slate-400 group-hover:text-[#0B2345] dark:group-hover:text-[#3DDC84] shrink-0 transition-colors"
        />
      </a>
    );
  }

  return (
    <a
      href={downloadUrl}
      download="schoolixiq.apk"
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col sm:flex-row items-center gap-4 sm:gap-5 w-full max-w-md mx-auto px-5 py-4 sm:px-6 sm:py-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 overflow-hidden transition-all duration-300 hover:border-[#3DDC84]/40 hover:shadow-xl hover:shadow-[#0B2345]/10 hover:-translate-y-0.5 active:scale-[0.99]"
      aria-label={`تحميل تطبيق ${appName} للأندرويد`}
    >
      <span
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-[#0B2345]/[0.04] via-transparent to-[#3DDC84]/[0.08]"
        aria-hidden
      />
      <span
        className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0B2345] via-[#D4A64A] to-[#3DDC84] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center"
        aria-hidden
      />

      <span className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0B2345] to-[#1a3a6b] text-white shadow-lg shadow-[#0B2345]/25 group-hover:shadow-emerald-500/20 group-hover:scale-105 transition-all duration-300">
        <AndroidMark className="w-8 h-8 sm:w-9 sm:h-9 text-[#3DDC84] group-hover:text-white transition-colors duration-300" />
      </span>

      <span className="relative flex-1 text-center sm:text-start min-w-0">
        <span className="block text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-[#0B2345] dark:group-hover:text-white transition-colors">
          تحميل تطبيق {appName} للأندرويد
        </span>
        <span className="block text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 group-hover:text-slate-600 dark:group-hover:text-slate-300">
          إشعارات فورية • تجربة أسرع على الهاتف
        </span>
      </span>

      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0B2345] dark:text-slate-300 group-hover:bg-[#0B2345] group-hover:text-white transition-all duration-300">
        <Download size={18} className="group-hover:scale-110 transition-transform duration-300" />
      </span>
    </a>
  );
}

export default FooterAndroidDownload;
