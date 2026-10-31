import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { BellRing, Download, ShieldCheck, X, Zap } from 'lucide-react';
import { useSystemConfig } from '../lib/SystemConfigContext';
import {
  ANDROID_APK_FILENAME,
  DEFAULT_ANDROID_APK_ABSOLUTE_URL,
  DEFAULT_ANDROID_APK_PATH,
  normalizeAndroidApkUrl,
  resolveAndroidApkUrl,
} from '../lib/androidApk';
import SchoolixLogo from './SchoolixLogo';

const DISMISSED_KEY = 'sx_android_apk_banner_dismissed_at';
const DOWNLOADED_KEY = 'sx_android_apk_banner_downloaded_at';
const DAY_MS = 24 * 60 * 60 * 1000;

function readTime(key: string): number {
  try {
    return Number(localStorage.getItem(key) || 0);
  } catch {
    return 0;
  }
}

function writeNow(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* private mode: the banner simply shows again next visit */
  }
}

/** Android phone browser only — not iPhone/iPad, not desktop, not inside the Android app itself. */
function isAndroidPhoneBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (!/Android/i.test(ua) || !/Mobile/i.test(ua)) return false;
  if (Capacitor.isNativePlatform()) return false;
  return true;
}

/**
 * Direct download banner for the SchoolixIQ Android app (APK).
 * Shows on any Android phone browser; "later" hides it for 3 days, a download for 14 days.
 */
export default function InstallAppBanner() {
  const { config } = useSystemConfig();
  const apkUrl = useMemo(() => {
    const resolved = resolveAndroidApkUrl(config?.androidApkUrl);
    // The APK ships with the site under /downloads: use this origin (www or not) so the
    // browser treats it as a same-site download.
    return resolved === DEFAULT_ANDROID_APK_ABSOLUTE_URL
      ? normalizeAndroidApkUrl(DEFAULT_ANDROID_APK_PATH)
      : resolved;
  }, [config?.androidApkUrl]);
  const [visible, setVisible] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!apkUrl || !isAndroidPhoneBrowser()) return;
    const now = Date.now();
    if (now - readTime(DISMISSED_KEY) < 3 * DAY_MS) return;
    if (now - readTime(DOWNLOADED_KEY) < 14 * DAY_MS) return;
    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, [apkUrl]);

  const dismiss = () => {
    writeNow(DISMISSED_KEY);
    setVisible(false);
  };

  const onDownload = () => {
    writeNow(DOWNLOADED_KEY);
    setDownloaded(true);
  };

  if (!apkUrl) return null;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.aside
          key="android-apk-banner"
          initial={{ y: 140, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 140, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          className="sx-apk-banner"
          dir="rtl"
          role="dialog"
          aria-label="تحميل تطبيق SchoolixIQ لأندرويد"
        >
          <button type="button" className="sx-apk-banner__close" onClick={dismiss} aria-label="إغلاق">
            <X size={16} />
          </button>
          <div className="sx-apk-banner__row">
            <span className="sx-apk-banner__icon" aria-hidden>
              <SchoolixLogo size={30} surface="dark" />
            </span>
            <div className="sx-apk-banner__copy">
              <p className="sx-apk-banner__eyebrow">تطبيق أندرويد الرسمي</p>
              <p className="sx-apk-banner__title">حمّل تطبيق SchoolixIQ</p>
              <p className="sx-apk-banner__perks">
                <span><BellRing size={12} /> إشعارات فورية</span>
                <span><Zap size={12} /> أسرع</span>
                <span><ShieldCheck size={12} /> آمن</span>
              </p>
            </div>
          </div>
          {downloaded ? (
            <p className="sx-apk-banner__hint" role="status">
              جارٍ التحميل… افتح الملف من الإشعارات ثم اضغط «تثبيت». إذا طلب الهاتف السماح بالتثبيت من هذا المصدر، فعّله مرة واحدة.
            </p>
          ) : null}
          <div className="sx-apk-banner__actions">
            <a
              href={apkUrl}
              download={ANDROID_APK_FILENAME}
              rel="noopener"
              className="sx-apk-banner__cta"
              onClick={onDownload}
            >
              <Download size={16} />
              {downloaded ? 'إعادة التحميل' : 'تحميل التطبيق'}
            </a>
            <button type="button" className="sx-apk-banner__later" onClick={dismiss}>
              {downloaded ? 'تم' : 'لاحقاً'}
            </button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
