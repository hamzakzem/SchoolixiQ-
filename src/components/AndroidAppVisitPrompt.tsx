import { useEffect, useRef } from 'react';
import { useLanguage } from '../lib/LanguageContext';
import { useAuth } from '../lib/AuthContext';
import {
  isAndroidApkPromptDismissed,
  shouldPromoteAndroidApp,
  triggerAndroidApkDownload,
} from '../lib/androidAppDownload';
import { useSystemConfig } from '../lib/SystemConfigContext';
import { toast } from 'react-hot-toast';

const SESSION_KEY = 'schoolix_android_visit_toast_shown_v2';

/** One-time alert on Android mobile web encouraging APK install + push capability. */
export default function AndroidAppVisitPrompt() {
  const { t, language } = useLanguage();
  const { config } = useSystemConfig();
  const { user, loading } = useAuth();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    if (loading || user) return;
    if (!shouldPromoteAndroidApp()) return;
    if (isAndroidApkPromptDismissed()) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    shown.current = true;
    sessionStorage.setItem(SESSION_KEY, '1');

    const toastId = toast(
      (tInstance) => (
        <div className="max-w-[min(100vw-2rem,22rem)] text-start font-sans">
          <p className="text-sm font-black text-slate-900">{t('androidAppVisitTitle')}</p>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t('androidAppVisitBody')}</p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              className="flex-1 py-2 rounded-xl bg-[#0B2345] text-white text-xs font-bold"
              onClick={() => {
                triggerAndroidApkDownload({
                  configUrl: config.androidApkUrl,
                  isRtl: language === 'ar',
                });
                toast.success(t('androidAppDownloadStarted'));
                toast.dismiss(tInstance.id);
              }}
            >
              {t('androidAppDownloadBtn')}
            </button>
            <button
              type="button"
              className="py-2 px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
              onClick={() => toast.dismiss(tInstance.id)}
            >
              {t('later')}
            </button>
          </div>
        </div>
      ),
      {
        duration: 12000,
        position: 'top-center',
        icon: '📲',
      },
    );

    return () => {
      toast.dismiss(toastId);
    };
  }, [loading, user, t]);

  return null;
}
