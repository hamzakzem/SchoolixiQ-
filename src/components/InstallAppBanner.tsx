import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, Star } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { toast } from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import {
  shouldPromoteAndroidApp,
  startAndroidAppInstall,
  dismissAndroidApkPrompt,
  isAndroidApkPromptDismissed,
  shouldHideAppDownloadPromo,
} from '../lib/androidAppDownload';
import { useSystemConfig } from '../lib/SystemConfigContext';
import { useAuth } from '../lib/AuthContext';

export default function InstallAppBanner() {
  const { t, isRtl, language } = useLanguage();
  const { config } = useSystemConfig();
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (user || shouldHideAppDownloadPromo() || Capacitor.isNativePlatform()) return;

    const dismissedTime = localStorage.getItem('schoolix_pwa_dismissed_time');
    if (dismissedTime) {
      const daysSinceDismissal =
        (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < 3) return;
    }

    if (!shouldPromoteAndroidApp() || isAndroidApkPromptDismissed()) return;

    const timer = window.setTimeout(() => setShowBanner(true), 2200);
    return () => window.clearTimeout(timer);
  }, [user]);

  const handleInstallClick = () => {
    startAndroidAppInstall({
      configUrl: config.androidApkUrl,
      isRtl: language === 'ar',
    });
    toast.success(t('androidAppDownloadStarted'));
    toast(t('androidAppDownloadHint'), { icon: '📲', duration: 8000 });
    setShowBanner(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('schoolix_pwa_dismissed_time', Date.now().toString());
    dismissAndroidApkPrompt();
    setShowBanner(false);
  };

  if (user || shouldHideAppDownloadPromo() || Capacitor.isNativePlatform()) return null;
  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-0 left-0 right-0 z-[9990] p-4 md:p-6 bg-transparent pointer-events-none flex justify-center">
        <motion.div
          initial={{ y: 150, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 150, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-indigo-100/80 dark:border-indigo-950/40 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 pointer-events-auto overflow-hidden p-6 relative"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500" />

          <button
            onClick={handleDismiss}
            className="absolute top-5 left-5 md:top-6 md:left-6 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Smartphone className="w-8 h-8 animate-pulse text-indigo-50" />
            </div>

            <div className="flex-1 pr-1 pl-3 text-right">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="bg-indigo-50 dark:bg-indigo-950/40 text-[#0B2345] dark:text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {t('nativeAppLabel')}
                </span>
                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={11} fill="currentColor" />
                  ))}
                </div>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
                {t('androidAppDownloadTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold font-sans">
                {t('androidAppDownloadDesc')}
              </p>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 py-3 px-5 bg-[#0B2345] hover:bg-indigo-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download size={14} />
                  {t('androidAppDownloadBtn')}
                </button>
                <button
                  onClick={handleDismiss}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                >
                  {t('later')}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
