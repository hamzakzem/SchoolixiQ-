import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, ArrowUp, Share, PlusSquare, Info, Star } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { toast } from 'react-hot-toast';

export default function InstallAppBanner() {
  const { isRtl } = useLanguage();
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const downloadMobileConfig = () => {
    const profileXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key>
      <true/>
      <key>Icon</key>
      <data>
        iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAABXklEQVR4nO2WsU4CMRRFb8EILg6OJsYBB3+Co4Oji/8g
        /of7MjoZsDo6EAcX6XW6pVAeF7pG03uS9gXb0pS778vLqyAiIiIiIiIiIiIiIiIiIiIiIiIiIiIievX09DzMv063BvABrIEtQAfoA8cAtG2fM9K1XpE+sKst
        q2Fq+77nZf66bY7AIn9dFfV6O1/Zz6B0U+6y5W0H2AKX6iX6p9rZ9oT153uI5yv6U8gYI5+v9KdyqZ5yZ+Q3mOepbE7kK9YpZ0be6m9b6BGrv23r78/S9Zlz
        9S7lXN9D4Gv+2m/Tfshb6Anb0FfM0f6v+Xv0XbO8beXFfA9GvsIcsU5nzDbyjP31U3O8Tfvk7DlyzH6asV72/99039/Zf39Xvv5PcsR+GvscEWevWe6/XofY
        DWe6mUfsp/Fj9G+YyZfR/SMyrYn92N8RERERERERERERERERERERERERERERkR79AdA9W8G957+9AAAAAElFTkSuQmCC
      </data>
      <key>IsRemovable</key>
      <true/>
      <key>Label</key>
      <string>SchoolixiQ</string>
      <key>PayloadDescription</key>
      <string>منصة SchoolixiQ التعليمية</string>
      <key>PayloadDisplayName</key>
      <string>SchoolixiQ</string>
      <key>PayloadIdentifier</key>
      <string>com.schoolixiq.app</string>
      <key>PayloadType</key>
      <string>com.apple.webclip.managed</string>
      <key>PayloadUUID</key>
      <string>9B6DB8A9-9A2E-47C2-9852-B3EA5D0408CD</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>URL</key>
      <string>https://schoolixiq.com</string>
    </dict>
  </array>
  <key>PayloadDisplayName</key>
  <string>منصة SchoolixiQ</string>
  <key>PayloadIdentifier</key>
  <string>com.schoolixiq.profile</string>
  <key>PayloadOrganization</key>
  <string>SchoolixiQ</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>1A3FB4D2-8A7E-41F6-9EF3-94DC2E0407EF</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>`;

    const blob = new Blob([profileXML], { type: 'application/x-apple-aspen-config' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'schoolixiq.mobileconfig';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(isRtl ? 'جاري تنزيل ملف التعريف الإلكتروني بنجاح!' : 'Downloading profile configuration file successfully!');
  };

  useEffect(() => {
    // 1. Detect if the app is already running in standalone mode (i.e., installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      console.log('App is already running in PWA standalone mode');
      return;
    }

    // 2. Check dismissal state
    const dismissedTime = localStorage.getItem('schoolix_pwa_dismissed_time');
    const now = Date.now();
    if (dismissedTime) {
      const daysSinceDismissal = (now - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
      // Suppress showing the prompt for 3 days after a manual dismissal to preserve user experience
      if (daysSinceDismissal < 3) {
        return;
      }
    }

    // 3. Detect Platform
    const userAgent = window.navigator.userAgent || window.navigator.vendor || (window as any).opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /android/i.test(userAgent);

    if (isIOS) {
      setPlatform('ios');
      // Show iOS banner after a small delay (4 seconds) of first mount
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 4000);
      return () => clearTimeout(timer);
    } else if (isAndroid) {
      setPlatform('android');
    }

    // 4. Handle Android / Chromium Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser-driven mini-bar from showing
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt banner after a short delay
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If already installed, hide prompt
    const handleAppInstalled = () => {
      console.log('SchoolixiQ was installed successfully');
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (platform === 'ios') {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback instruction for browsers where deferredPrompt isn't loaded yet
      alert(isRtl ? 'يرجى النقر على النقاط الثلاث العلوية في المتصفح واختيار "تثبيت التطبيق" أو "الإضافة للشاشة الرئيسية"' : 'Please click on the browse menu and choose "Add to Home screen" or "Install App".');
      return;
    }

    // Show the browser install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    // We no longer need the prompt, clear it
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('schoolix_pwa_dismissed_time', Date.now().toString());
    setShowBanner(false);
  };

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
                  <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {isRtl ? 'نسخة التطبيق' : 'Native App'}
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
                  {isRtl ? 'تثبيت منصة SchoolixiQ كـتطبيق' : 'Install SchoolixiQ Web App'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold font-sans">
                  {isRtl 
                    ? 'احصل على تجربة اتصال فائقة السرعة، تصفح أسرع، وتنبيهات فورية (الحضور، الواجبات، الدرجات، المحادثات) مباشرة على هاتفك دون متصفح.'
                    : 'Install the native-feel app on your device for lightning-fast speeds and instant real-time alerts.'}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Download size={14} />
                    {isRtl ? 'تثبيت التطبيق الآن' : 'Install App Now'}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                  >
                    {isRtl ? 'لاحقاً' : 'Later'}
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
                <Info className="text-indigo-600 dark:text-indigo-400" size={18} />
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  {isRtl ? 'خطوات التثبيت على نظام iOS (آيفون وايباد)' : 'Step-by-Step iOS Installation'}
                </h3>
              </div>

              <div className="space-y-4 text-xs font-bold text-slate-800 dark:text-slate-100 leading-relaxed text-right">
                <p className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm text-center mb-1">
                  {isRtl ? "✓ تم تجهيز التثبيت فائق السرعة للآيفون" : "✓ iOS Smart App Installed Ready!"}
                </p>

                {/* Professional Automatic Profile Setup */}
                <div className="bg-gradient-to-br from-indigo-50/60 to-violet-50/60 dark:from-indigo-950/20 dark:to-violet-950/20 p-3.5 rounded-2xl border border-indigo-100/40 dark:border-indigo-900/40 text-center">
                  <p className="font-extrabold text-xs text-indigo-950 dark:text-indigo-200 mb-1">
                    {isRtl ? "تثبيت ذكي بنقرتين (موصى به جداً)" : "Smart 2-Click Install (Highly Recommended)"}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2.5 font-medium leading-normal">
                    {isRtl ? "تثقيف فوري للمنصة مباشرة على شاشتك دون تعقيدات متجر التطبيقات." : "Instant platform setup on your home screen bypassing complicated setup."}
                  </p>
                  <button
                    type="button"
                    onClick={downloadMobileConfig}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/15 cursor-pointer"
                  >
                    <Download size={12} />
                    {isRtl ? "تحميل وتثبيت فوري مباشر" : "Download & Fast Install"}
                  </button>

                  <div className="mt-2.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 text-right bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-slate-100/50">
                    <p className="font-extrabold text-indigo-600 dark:text-indigo-400">💡 طريقة التفعيل السهلة:</p>
                    <p>١. اضغط 'السماح' عند ظهور التنبيه.</p>
                    <p>٢. اذهب للإعدادات واضغط (تم تنزيل ملف التعريف) بالأعلى ثم تثبيت.</p>
                  </div>
                </div>

                {/* Separation */}
                <div className="relative flex items-center justify-center my-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200/50 dark:border-slate-800"></div></div>
                  <span className="relative px-2 bg-white dark:bg-slate-900 text-[10px] text-slate-400 font-extrabold">
                    {isRtl ? "أو التثبيت اليدوي التقليدي" : "OR Traditional Manual Setup"}
                  </span>
                </div>

                <details className="group border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-2xl transition-all">
                  <summary className="flex items-center justify-between p-2.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <span>{isRtl ? "عرض طريقة سفاري اليدوية" : "Show Safari manual guide"}</span>
                    <span className="transition-transform group-open:rotate-180">▼</span>
                  </summary>
                  <div className="p-2.5 pt-0 border-t border-slate-50 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-start gap-2 pt-2">
                      <span className="w-4 h-4 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isRtl ? "اضغط على زر المشاركة (Share) في Safari بالأسفل." : "Tap the Share icon in iOS Safari."}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isRtl ? "اختر إضافة للشاشة الرئيسية (Add to Home Screen)." : "Choose Add to Home Screen."}
                      </p>
                    </div>
                  </div>
                </details>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs transition-all shadow-md cursor-pointer hover:shadow-indigo-500/15"
                >
                  {isRtl ? 'موافق، سأقوم بالتثبيت' : 'Got it, thanks'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                >
                  {isRtl ? 'إغلاق الإشعار' : 'Close Notification'}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
