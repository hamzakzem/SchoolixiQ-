import { ExternalLink, Download } from 'lucide-react';
import {
  getIosAppStoreUrl,
  hasIosOfficialDownload,
  openIosInstall,
} from '../lib/iosAppDownload';
import { useSystemConfig } from '../lib/SystemConfigContext';
import { useLanguage } from '../lib/LanguageContext';

type Props = {
  appName?: string;
  compact?: boolean;
};

function AppleMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

/**
 * تحميل iPhone — App Store إن وُجد، وإلا تثبيت ويب (ملف تعريف / Safari) متوافق مع Apple.
 */
export function FooterIosDownload({ appName = 'SchoolixiQ', compact = false }: Props) {
  const { config } = useSystemConfig();
  const { t, isRtl } = useLanguage();
  const storeUrl = getIosAppStoreUrl(config);
  const isStore = hasIosOfficialDownload(config);
  const href = storeUrl || 'https://schoolixiq.com/?install=ios';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openIosInstall(config);
  };

  const title = isStore
    ? t('iosAppStoreDownloadTitle')
    : isRtl
      ? `تحميل تطبيق ${appName} لـ iPhone`
      : `Install ${appName} on iPhone`;
  const subtitle = isStore
    ? t('iosAppStoreDownloadDesc')
    : t('iosWebInstallDesc');
  const btnLabel = isStore ? t('iosAppStoreDownloadBtn') : t('iosWebInstallBtn');

  if (compact) {
    return (
      <a
        href={href}
        onClick={handleClick}
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-800/10 bg-slate-900 hover:bg-black text-white shadow-md transition-all active:scale-[0.98]"
        aria-label={title}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
          <AppleMark className="w-5 h-5" />
        </span>
        <span className="text-[11px] font-bold">{btnLabel}</span>
        {isStore ? (
          <ExternalLink size={14} className="opacity-70 shrink-0" />
        ) : (
          <Download size={14} className="opacity-70 shrink-0" />
        )}
      </a>
    );
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      rel="noopener noreferrer"
      className="group relative flex flex-col sm:flex-row items-center gap-4 sm:gap-5 w-full max-w-md mx-auto px-5 py-4 sm:px-6 sm:py-5 rounded-2xl border border-slate-800/15 bg-slate-900 text-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99]"
      aria-label={title}
    >
      <span className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
        <AppleMark className="w-8 h-8 sm:w-9 sm:h-9" />
      </span>
      <span className="relative flex-1 text-center sm:text-start min-w-0">
        <span className="block text-sm sm:text-base font-black">{title}</span>
        <span className="block text-[11px] sm:text-xs font-medium text-white/70 mt-1">
          {subtitle}
        </span>
      </span>
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
        {isStore ? <ExternalLink size={18} /> : <Download size={18} />}
      </span>
    </a>
  );
}

export default FooterIosDownload;
