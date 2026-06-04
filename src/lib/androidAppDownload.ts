import { Capacitor } from '@capacitor/core';

const DISMISS_KEY = 'schoolix_android_apk_prompt_dismissed';
const DISMISS_DAYS = 2;
const APK_FILENAME = 'schoolixiq.apk';

/** Hide APK / install prompts inside the installed native app. */
export function shouldHideAppDownloadPromo(): boolean {
  return Capacitor.isNativePlatform();
}

/** True when user is on Android mobile browser (not the installed native app). */
export function shouldPromoteAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return false;
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return true;
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

function originBase(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  const appUrl = (
    (import.meta.env.VITE_APP_URL as string | undefined) ||
    (import.meta.env.APP_URL as string | undefined) ||
    ''
  ).trim();
  return appUrl.replace(/\/$/, '') || 'https://schoolixiq.com';
}

/**
 * Direct one-click download URL (static file on Hostinger).
 * API route is fallback for Node server only.
 */
export function getAndroidApkDownloadUrl(configUrl?: string | null): string {
  const configured = configUrl?.trim();
  if (configured) return configured;

  const fromEnv = (import.meta.env.VITE_ANDROID_APK_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv;

  return `${originBase()}/downloads/${APK_FILENAME}`;
}

export function getAndroidApkDownloadCandidates(configUrl?: string | null): string[] {
  const base = originBase();
  const primary = getAndroidApkDownloadUrl(configUrl);
  const list = [
    primary,
    `${base}/downloads/${APK_FILENAME}`,
    `${base}/api/download/${APK_FILENAME}`,
  ];
  if (import.meta.env.PROD) {
    list.push(`https://schoolixiq.com/downloads/${APK_FILENAME}`);
  }
  return [...new Set(list.filter(Boolean))];
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

/** Starts APK download immediately (one tap — no HEAD pre-check). */
export function triggerAndroidApkDownload(
  _options: { configUrl?: string | null; isRtl?: boolean } = {},
): boolean {
  if (typeof window === 'undefined') return false;

  const url = getAndroidApkDownloadUrl(_options.configUrl);

  // Same-origin static file: full navigation triggers download on Android Chrome
  const link = document.createElement('a');
  link.href = url;
  link.download = APK_FILENAME;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Fallback for browsers that ignore programmatic download
  window.setTimeout(() => {
    if (document.visibilityState !== 'hidden') {
      window.location.assign(url);
    }
  }, 400);

  return true;
}
