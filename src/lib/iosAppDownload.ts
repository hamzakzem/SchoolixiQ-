import { Capacitor } from '@capacitor/core';

const DISMISS_KEY = 'schoolix_ios_app_prompt_dismissed';
const DISMISS_DAYS = 2;
const IOS_INSTALL_QUERY = 'install=ios';
/** Static file on Hostinger (SPA /api/* returns index.html and causes refresh loop). */
export const IOS_MOBILECONFIG_PATH = '/downloads/schoolixiq.mobileconfig';
/** صفحة تعليمات التثبيت (خارج SPA) — الطريقة الصحيحة لإضافة أيقونة على الشاشة الرئيسية */
export const IOS_INSTALL_GUIDE_PATH = '/install-iphone.html';

/** Production site — تثبيت iPhone عبر Safari / ملف التعريف (متوافق مع Apple) */
export const DEFAULT_IOS_WEB_INSTALL_URL = 'https://schoolixiq.com';

export type IosDownloadConfig = {
  iosAppStoreUrl?: string | null;
  iosTestFlightUrl?: string | null;
  iosWebInstallUrl?: string | null;
  iosInstallEnabled?: boolean | null;
};

/** Hide iOS download promo inside the installed native app. */
export function shouldHideAppDownloadPromo(): boolean {
  return Capacitor.isNativePlatform();
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  return /iPad|iPhone|iPod/i.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
}

/** ملف التعريف و«إضافة للشاشة الرئيسية» يعملان من Safari فقط على iOS */
export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosSafari(): boolean {
  if (!isIosDevice()) return false;
  const ua = window.navigator.userAgent || '';
  return (
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|mercury|FBAN|FBAV|Instagram|Line\//i.test(ua)
  );
}

export function getIosInstallGuideUrl(config?: IosDownloadConfig | null): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}${IOS_INSTALL_GUIDE_PATH}`;
  }
  return `${getIosWebInstallUrl(config)}${IOS_INSTALL_GUIDE_PATH}`;
}

export function shouldPromoteIosApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return false;
  return isIosDevice();
}

export function isIosInstallDeepLink(search?: string): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(search ?? window.location.search);
  return params.get('install') === 'ios';
}

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, '');
}

/** رابط الموقع لتثبيت التطبيق على الشاشة الرئيسية (بدون App Store). */
export function getIosWebInstallUrl(config?: IosDownloadConfig | null): string {
  const fromConfig = config?.iosWebInstallUrl?.trim();
  const fromEnv = (import.meta.env.VITE_IOS_WEB_INSTALL_URL as string | undefined)?.trim();
  const appUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  const origin =
    fromConfig ||
    fromEnv ||
    appUrl ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    DEFAULT_IOS_WEB_INSTALL_URL;
  return normalizeOrigin(origin || DEFAULT_IOS_WEB_INSTALL_URL);
}

export function getIosInstallLandingUrl(config?: IosDownloadConfig | null): string {
  const base = getIosWebInstallUrl(config);
  return `${base}${IOS_MOBILECONFIG_PATH}`;
}

export function getIosMobileConfigUrl(config?: IosDownloadConfig | null): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}${IOS_MOBILECONFIG_PATH}`;
  }
  return `${getIosWebInstallUrl(config)}${IOS_MOBILECONFIG_PATH}`;
}

export function isIosWebInstallEnabled(config?: IosDownloadConfig | null): boolean {
  if (config?.iosInstallEnabled === false) return false;
  return true;
}

/** Extract numeric Apple app id from App Store / TestFlight URLs. */
export function extractAppleAppId(url: string): string | null {
  const trimmed = url.trim();
  const idMatch = trimmed.match(/\/id(\d{5,})/i) || trimmed.match(/id(\d{5,})/i);
  return idMatch?.[1] ?? null;
}

function normalizeStoreUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^id\d+$/i.test(trimmed)) {
    return `https://apps.apple.com/app/id${trimmed.replace(/^id/i, '')}`;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Official Apple distribution link (App Store or TestFlight).
 * Empty until published — never use direct IPA links.
 */
export function getIosAppStoreUrl(
  config?: IosDownloadConfig | null,
  options?: { preferTestFlight?: boolean },
): string | null {
  const preferTestFlight = options?.preferTestFlight ?? false;
  const fromEnvStore = (
    import.meta.env.VITE_IOS_APP_STORE_URL as string | undefined
  )?.trim();
  const fromEnvTf = (
    import.meta.env.VITE_IOS_TESTFLIGHT_URL as string | undefined
  )?.trim();

  const store = config?.iosAppStoreUrl?.trim() || fromEnvStore || '';
  const testFlight = config?.iosTestFlightUrl?.trim() || fromEnvTf || '';

  if (preferTestFlight && testFlight) return normalizeStoreUrl(testFlight);
  if (store) return normalizeStoreUrl(store);
  if (testFlight) return normalizeStoreUrl(testFlight);
  return null;
}

export function hasIosOfficialDownload(config?: IosDownloadConfig | null): boolean {
  return Boolean(getIosAppStoreUrl(config));
}

/** iPhone download available on the web (App Store أو تثبيت ويب رسمي). */
export function hasIosDownloadAvailable(config?: IosDownloadConfig | null): boolean {
  if (shouldHideAppDownloadPromo()) return false;
  if (!isIosWebInstallEnabled(config)) return false;
  return hasIosOfficialDownload(config) || true;
}

/** ملف تعريف iOS — اختصار إلى الشاشة الرئيسية (Apple Web Clip). */
export function triggerIosWebClipInstall(): void {
  if (typeof window === 'undefined') return;
  if (!isIosSafari()) {
    window.location.assign(getIosInstallGuideUrl());
    return;
  }
  const url = getIosMobileConfigUrl();
  window.location.assign(`${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`);
}

/** Opens App Store / TestFlight. Returns false if no URL configured. */
export function openIosAppDownload(
  config?: IosDownloadConfig | null,
  options?: { preferTestFlight?: boolean },
): boolean {
  const url = getIosAppStoreUrl(config, options);
  if (!url || typeof window === 'undefined') return false;

  const appId = extractAppleAppId(url);
  const isTestFlight = url.includes('testflight.apple.com');

  if (isIosDevice()) {
    if (isTestFlight) {
      window.location.assign(url);
      return true;
    }
    if (appId) {
      window.location.assign(`itms-apps://apps.apple.com/app/id${appId}`);
      return true;
    }
    window.location.assign(url);
    return true;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

/** يعرض تعليمات «إضافة إلى الشاشة الرئيسية» داخل الموقع (Safari فقط). */
export function promptIosSafariInstallUI(): void {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return;
  window.dispatchEvent(new CustomEvent('schoolix:ios-install-prompt'));
}

/**
 * تحميل/تثبيت على iPhone: App Store إن وُجد، وإلا Safari → الشاشة الرئيسية.
 * ملف التعريف غير الموقّع لا يضيف أيقونة على iOS الحديث.
 */
export function openIosInstall(config?: IosDownloadConfig | null): boolean {
  if (typeof window === 'undefined' || !isIosWebInstallEnabled(config)) return false;

  if (hasIosOfficialDownload(config)) {
    return openIosAppDownload(config);
  }

  if (isIosDevice()) {
    if (isIosSafari()) {
      promptIosSafariInstallUI();
      return true;
    }
    window.location.assign(getIosInstallGuideUrl(config));
    return true;
  }

  window.open(getIosInstallGuideUrl(config), '_blank', 'noopener,noreferrer');
  return true;
}

/** Strip ?install=ios so SPA does not re-trigger on navigation. */
export function clearIosInstallQueryFromUrl(): void {
  if (typeof window === 'undefined' || !isIosInstallDeepLink()) return;
  const url = new URL(window.location.href);
  url.searchParams.delete('install');
  const next = url.searchParams.toString()
    ? `${url.pathname}?${url.searchParams}${url.hash}`
    : `${url.pathname}${url.hash}`;
  window.history.replaceState(window.history.state, '', next);
}

export function isIosPromptDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const days = (Date.now() - parseInt(raw, 10)) / (1000 * 60 * 60 * 24);
    return days < DISMISS_DAYS;
  } catch {
    return false;
  }
}

export function dismissIosPrompt(): void {
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  } catch {
    /* ignore */
  }
}

