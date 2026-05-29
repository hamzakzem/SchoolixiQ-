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
    toast.success(isRtl ? "جاري تحضير ملف التعريف وتنزيله بنجاح..." : "Preparing and downloading configuration profile...");
    window.location.href = "/api/download/schoolixiq.mobileconfig";
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
                <p className="text-emerald-600 dark:text-emerald-400 font-extrabold text-center text-sm md:text-base mb-1 flex items-center justify-center gap-1">
                  <span>✨</span>
                  {isRtl ? "تم تحضير طريقتين ميسّرتين لتثبيت التطبيق على الآيفون" : "Two easy ways prepared for iOS Installation!"}
                </p>

                {/* Method 1: The Official Safari App Store Method (Add to Home Screen) - Safe, built-in, trusted, 100% sign status */}
                <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 p-4 rounded-3xl border border-emerald-100/60 dark:border-emerald-900/40 text-right">
                  <div className="flex items-center gap-2 mb-2 font-black text-emerald-900 dark:text-emerald-200">
                    <span className="w-5 h-5 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">١</span>
                    <span className="text-xs sm:text-sm font-black">{isRtl ? "طريقة سفاري الفورية (موصى بها جداً - آمنة وموثوقة 100٪)" : "Official Safari Method (Highly Recommended - 100% Secure)"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-3 pr-6">
                    {isRtl 
                      ? "طريقة آبل الرسمية المعتمدة التي تضمن لك تثبيت فوري آمن وموثوق تماماً، بدون ظهور أي رسائل تحذيرية أو حاجة للدخول في إعدادات الهاتف."
                      : "Apple's native secure method. Guarantees a fully trusted install directly, with no system configuration warning screens."}
                  </p>

                  <div className="space-y-2 pr-6 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <div className="flex items-start gap-1.5">
                      <span className="text-emerald-600">•</span>
                      <p>
                        {isRtl ? "اضغط على زر المشاركة (Share) في شريط متصفح Safari بالأسفل." : "Tap the Share icon in iOS Safari (bottom bar)."}
                      </p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-emerald-600">•</span>
                      <p>
                        {isRtl ? "اختر إضافة للشاشة الرئيسية (Add to Home Screen)." : "Select 'Add to Home Screen'."}
                      </p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-emerald-600">•</span>
                      <p>
                        {isRtl ? "انقر على إضافة (Add) في أعلى اليسار لبدء استخدام التطبيق فوراً وبشكل كامل." : "Tap 'Add' at the top right to launch instantly."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Method 2: Config Profile File */}
                <div className="bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/10 dark:to-violet-950/10 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 text-right">
                  <div className="flex items-center gap-2 mb-2 font-black text-slate-800 dark:text-slate-200">
                    <span className="w-5 h-5 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">٢</span>
                    <span className="text-xs sm:text-sm font-black">{isRtl ? "طريقة ملف التعريف التلقائي بنقرة واحدة" : "Or Download Secure iOS Configuration Profile"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-3 pr-6">
                    {isRtl 
                      ? "يتيح لك تثبيت فوري بنقرة واحدة. عند تنزيل ملف التعريف، من الطبيعي تماماً لجميع التطبيقات والمنصات الخارجية المستقلة أن يظهر لك نظام iOS عبارة (لم يتم التوقيع - Unsigned) باللون الأحمر لأنها لا تعتمد على حساب مطور تجاري مدفوع، وهي آمنة تماماً ومضمونة 100% ولا تسبب أي مشاكل."
                      : "Download custom shortcut profile. Note that iOS naturally labels local profiles as 'Unsigned' (Not Signed), which is standard for custom clips, but perfectly safe."}
                  </p>

                  <div className="pr-6 space-y-3">
                    <button
                      type="button"
                      onClick={downloadMobileConfig}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      <Download size={13} />
                      {isRtl ? "تنزيل وتثبيت الملف بنقرة واحدة" : "Download Configuration Profile"}
                    </button>

                    <div className="text-[10px] bg-white/70 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100/80 dark:border-slate-800/80 leading-normal text-slate-500 font-medium">
                      {isRtl ? "طريقة التشغيل بعد التحميل: اضغط 'سماح' للتنزيل، ثم افتح تطبيق (الإعدادات بجهازك Settings) واضغط على (تم تنزيل ملف التعريف) بالأعلى، ثم اضغط على تثبيت." : "Activation context: tap Allow, then go to Settings on your device, tap (Profile Downloaded) at the top and select Install."}
                    </div>
                  </div>
                </div>
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
