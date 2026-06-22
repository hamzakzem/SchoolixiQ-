import React, { useEffect, useState } from 'react';
import { Monitor, Download, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  canShowDesktopPwaInstall,
  dismissPwaDesktopPrompt,
  getDeferredPwaInstallPrompt,
  isDesktopPwaInstallContext,
  isPwaDesktopDismissed,
  isPwaStandalone,
  subscribePwaInstallAvailability,
} from '../lib/pwaUtils';

type PwaInstallPromptProps = {
  variant?: 'card' | 'header';
};

export function PwaInstallPrompt({ variant = 'card' }: PwaInstallPromptProps) {
  const { profile } = useAuth();
  const [installAvailable, setInstallAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(isPwaDesktopDismissed());
  const [installing, setInstalling] = useState(false);

  const roleAllowed = canShowDesktopPwaInstall(profile?.role);
  const contextAllowed = isDesktopPwaInstallContext() && !isPwaStandalone();

  useEffect(() => {
    const refresh = () => {
      setInstallAvailable(Boolean(getDeferredPwaInstallPrompt()));
    };
    refresh();
    return subscribePwaInstallAvailability(refresh);
  }, []);

  const visible =
    contextAllowed &&
    roleAllowed &&
    installAvailable &&
    !dismissed &&
    !isPwaStandalone();

  if (!visible) return null;

  const handleInstall = async () => {
    const promptEvent = getDeferredPwaInstallPrompt();
    if (!promptEvent) return;
    setInstalling(true);
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      console.info('[PWA] INSTALL_PROMPT_RESULT', { outcome });
      if (outcome === 'accepted') {
        setDismissed(true);
      }
    } catch (error) {
      console.warn('[PWA] INSTALL_PROMPT_ERROR', error);
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    dismissPwaDesktopPrompt();
    setDismissed(true);
  };

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={() => void handleInstall()}
        disabled={installing}
        className="hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-sx-accent/35 bg-sx-primary/80 px-3 py-2 text-xs font-bold text-sx-accent hover:bg-sx-accent hover:text-sx-primary transition-colors shrink-0"
        title="تثبيت التطبيق"
      >
        <Download size={14} />
        تثبيت التطبيق
      </button>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 p-4 md:p-5 shadow-sm"
      dir="rtl"
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 left-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="إغلاق"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3 pr-1">
        <div className="w-11 h-11 rounded-xl bg-[#0F172A] text-[#D4AF37] flex items-center justify-center shrink-0">
          <Monitor size={20} />
        </div>
        <div className="flex-1 min-w-0 text-right">
          <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white mb-1">
            ثبّت SchoolixIQ كتطبيق على الكمبيوتر
          </h3>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
            افتح النظام مباشرة من سطح المكتب بدون المتصفح
          </p>
          <p className="mt-2 text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            لتثبيت التطبيق على الكمبيوتر: اضغط تثبيت التطبيق، وسيظهر SchoolixIQ في سطح المكتب وقائمة Start.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleInstall()}
              disabled={installing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-black transition-colors"
            >
              <Download size={14} />
              {installing ? 'جاري التثبيت...' : 'تثبيت التطبيق'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PwaInstallPrompt;
