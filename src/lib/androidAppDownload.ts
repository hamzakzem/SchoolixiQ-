import { Capacitor } from '@capacitor/core';

const DISMISS_KEY = 'schoolix_android_apk_prompt_dismissed';
const DISMISS_DAYS = 2;

/** True when user is on Android mobile browser (not the installed native app). */
export function shouldPromoteAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return false;
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return true;
  // Some Android WebViews report as Linux + Mobile
  if (/Mobile/i.test(ua) && /Linux/i.test(ua) && !/iPhone|iPad/i.test(ua)) return true;
  try {
    const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData;
    if (uaData?.platform?.toLowerCase() === 'android') return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function getAndroidApkDownloadUrl(): string {
  const fromEnv = (import.meta.env.VITE_ANDROID_APK_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv;

  const appUrl = (
    (import.meta.env.VITE_APP_URL as string | undefined) ||
    (import.meta.env.APP_URL as string | undefined) ||
    ''
  ).trim();

  if (import.meta.env.PROD) {
    return 'https://schoolixiq.com/downloads/schoolixiq.apk';
  }

  const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base.replace(/\/$/, '')}/downloads/schoolixiq.apk`;
}

export function isAndroidApkPromptDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const days = (Date.now() - parseInt(raw, 10)) / (1000 * 60 * 60 * 24);
    return days < DISMISS_DAYS;
  } catch {
    return false;
  }
}

export function dismissAndroidApkPrompt(): void {
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  } catch {
    /* ignore */
  }
}

/** Starts APK download (same-origin or CDN URL). */
export function triggerAndroidApkDownload(): void {
  const url = getAndroidApkDownloadUrl();
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'schoolixiq.apk';
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, 400);
}
