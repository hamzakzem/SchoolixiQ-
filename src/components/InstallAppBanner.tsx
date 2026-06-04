import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, ArrowUp, Share, PlusSquare, Info, Star } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { toast } from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import {
  shouldPromoteAndroidApp,
  triggerAndroidApkDownload,
  dismissAndroidApkPrompt,
  isAndroidApkPromptDismissed,
} from '../lib/androidAppDownload';
import { useSystemConfig } from '../lib/SystemConfigContext';
import { useAuth } from '../lib/AuthContext';
import { shouldHideAppDownloadPromo } from '../lib/androidAppDownload';

export default function InstallAppBanner() {
  const { t, isRtl, language } = useLanguage();
  const { config } = useSystemConfig();
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const downloadMobileConfig = () => {
    toast.success(t('preparingProfileSuccess'));
    window.location.href = "/api/download/schoolixiq.mobileconfig";
  };

  useEffect(() => {
    if (user || shouldHideAppDownloadPromo() || Capacitor.isNativePlatform()) return;
    if (Capacitor.isNativePlatform()) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const dismissedTime = localStorage.getItem('schoolix_pwa_dismissed_time');
    if (dismissedTime) {
      const daysSinceDismissal =
        (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < 3) return;
    }

    const userAgent =
      window.navigator.userAgent || window.navigator.vendor || (window as any).opera || '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /android/i.test(userAgent);

    if (isIOS) {
      setPlatform('ios');
      setShowBanner(false);
      return;
    }

    if (!isAndroid) {
      setShowBanner(false);
      return;
    }

    setPlatform('android');

    // Android: promote official APK (not PWA)
    if (shouldPromoteAndroidApp() && !isAndroidApkPromptDismissed()) {
      const timer = window.setTimeout(() => setShowBanner(true), 2200);
      return () => window.clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [user]);

  const handleInstallClick = async () => {
    if (platform === 'ios') {
      setShowIOSInstructions(true);
      return;
    }

    if (platform === 'android') {
      triggerAndroidApkDownload({
        configUrl: config.androidApkUrl,
        isRtl: language === 'ar',
      });
      toast.success(t('androidAppDownloadStarted'));
      toast(t('androidAppDownloadHint'), { icon: '📲', duration: 8000 });
      setShowBanner(false);
      return;
    }

    if (!deferredPrompt) {
      alert(t('pwaInstallBrowserInstruction'));
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
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
          {/* Top subtle visual accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500"></div>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-5 left-5 md:top-6 md:left-6 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          {!showIOSInstructions ? (
            <div className="flex items-start gap-4">
              {/* App Icon Block */}
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Smartphone className="w-8 h-8 animate-pulse text-indigo-50" />
              </div>

              {/* Text content */}
              <div className="flex-1 pr-1 pl-3 text-right">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="bg-indigo-50 dark:bg-indigo-950/40 text-[#0B2345] dark:text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {t('nativeAppLabel')}
                  </span>
                  <div className="flex items-center text-amber-400">
                    <Star size={11} fill="currentColor" />
                    <Star size={11} fill="currentColor" />
                    <Star size={11} fill="currentColor" />
                    <Star size={11} fill="currentColor" />
                    <Star size={11} fill="currentColor" />
                  </div>
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
                  {platform === 'android' ? t('androidAppDownloadTitle') : t('installBannerTitle')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold font-sans">
                  {platform === 'android' ? t('androidAppDownloadDesc') : t('installBannerDesc')}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 py-3 px-5 bg-[#0B2345] hover:bg-indigo-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Download size={14} />
                    {platform === 'android' ? t('androidAppDownloadBtn') : t('installAppNow')}
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
          ) : (
            <motion.div 
              style={{ contentVisibility: 'auto' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-right"
            >
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Info className="text-[#0B2345] dark:text-indigo-400" size={18} />
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  {t('iosInstallSteps')}
                </h3>
              </div>

              <div className="space-y-4 text-xs font-bold text-slate-800 dark:text-slate-100 leading-relaxed text-right">
                <p className="text-emerald-600 dark:text-emerald-400 font-extrabold text-center text-sm md:text-base mb-1 flex items-center justify-center gap-1">
                  <span>✨</span>
                  {t('iosInstallTwoWays')}
                </p>

                {/* Method 1: The Official Safari App Store Method (Add to Home Screen) - Safe, built-in, trusted, 100% sign status */}
                <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 p-4 rounded-3xl border border-emerald-100/60 dark:border-emerald-900/40 text-right">
                  <div className="flex items-center gap-2 mb-2 font-black text-emerald-950 dark:text-emerald-200">
                    <span className="w-5 h-5 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">١</span>
                    <span className="text-xs sm:text-sm font-black">{t('iosMethodSafari')}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-3 pr-6">
                    {t('iosMethodSafariDesc')}
                  </p>

                  <div className="space-y-2 pr-6 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <div className="flex items-start gap-1.5">
                      <span className="text-emerald-600">•</span>
                      <p>
                        {t('iosSafariStep1')}
                      </p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-emerald-600">•</span>
                      <p>
                        {t('iosSafariStep2')}
                      </p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-emerald-600">•</span>
                      <p>
                        {t('iosSafariStep3')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Method 2: Config Profile File */}
                <div className="bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/10 dark:to-violet-950/10 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 text-right">
                  <div className="flex items-center gap-2 mb-2 font-black text-slate-800 dark:text-slate-200">
                    <span className="w-5 h-5 rounded-lg bg-[#0B2345] text-white flex items-center justify-center text-xs font-bold">٢</span>
                    <span className="text-xs sm:text-sm font-black">{t('iosMethodProfile')}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-3 pr-6">
                    {t('iosMethodProfileDesc')}
                  </p>

                  <div className="pr-6 space-y-3">
                    <a
                      href="/api/download/schoolixiq.mobileconfig"
                      onClick={() => {
                        toast.success(t('preparingProfileSuccess'));
                      }}
                      className="w-full py-2 bg-[#0B2345] hover:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer text-center"
                    >
                      <Download size={13} />
                      {t('iosDownloadProfile')}
                    </a>

                    <div className="text-[10px] bg-white/70 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100/80 dark:border-slate-800/80 leading-normal text-slate-500 font-medium">
                      {t('iosProfileInstructions')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="flex-1 py-3 px-4 bg-[#0B2345] hover:bg-indigo-700 text-white font-black rounded-2xl text-xs transition-all shadow-md cursor-pointer hover:shadow-indigo-500/15"
                >
                  {t('gotItThanks')}
                </button>
                <button
                  onClick={handleDismiss}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                >
                  {t('closeNotification')}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
