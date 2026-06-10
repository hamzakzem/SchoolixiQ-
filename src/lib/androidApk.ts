/** Default production APK URL (must end with .apk). */
export const DEFAULT_ANDROID_APK_ABSOLUTE_URL =
  'https://schoolixiq.com/downloads/schoolixiq.apk';

/** Same-origin path when hosting the APK beside the web build. */
export const DEFAULT_ANDROID_APK_PATH = '/downloads/schoolixiq.apk';

export const ANDROID_APK_NOT_CONFIGURED_MSG_AR =
  'رابط تحميل تطبيق Android غير مضبوط';

export const ANDROID_APK_FILENAME = 'schoolixiq.apk';

function getOriginFallback(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://schoolixiq.com';
}

/** Normalize relative paths to absolute URLs. */
export function normalizeAndroidApkUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, getOriginFallback()).href;
}

/** True only for http(s) URLs whose path ends with .apk (never homepage). */
export function isValidAndroidApkUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(normalizeAndroidApkUrl(trimmed));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const pathname = parsed.pathname.toLowerCase();
    if (!pathname.endsWith('.apk')) return false;
    if (pathname === '/' || pathname === '/index.html') return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve Android APK download URL.
 * Order: Firestore androidApkUrl → VITE_ANDROID_APK_URL → production default.
 * Never falls back to app homepage or PWA URL.
 */
export function resolveAndroidApkUrl(firestoreApkUrl?: string | null): string | null {
  const candidates = [
    firestoreApkUrl,
    import.meta.env.VITE_ANDROID_APK_URL,
    DEFAULT_ANDROID_APK_ABSOLUTE_URL,
  ];

  for (const raw of candidates) {
    const value = String(raw || '').trim();
    if (!value) continue;

    const normalized = normalizeAndroidApkUrl(value);
    if (isValidAndroidApkUrl(normalized)) {
      return normalized;
    }
  }

  return null;
}

/** @deprecated Use resolveAndroidApkUrl — kept for callers without Firestore context. */
export function getAndroidApkDownloadUrl(firestoreApkUrl?: string | null): string | null {
  return resolveAndroidApkUrl(firestoreApkUrl);
}

/** True when Firestore or build-time env explicitly sets an APK URL. */
export function hasConfiguredAndroidApkUrl(firestoreApkUrl?: string | null): boolean {
  const firestore = String(firestoreApkUrl || '').trim();
  const env = String(import.meta.env.VITE_ANDROID_APK_URL || '').trim();
  return Boolean(
    (firestore && isValidAndroidApkUrl(normalizeAndroidApkUrl(firestore))) ||
      (env && isValidAndroidApkUrl(normalizeAndroidApkUrl(env))),
  );
}

/** Trigger a direct APK download (never navigates to homepage). */
export function triggerAndroidApkDownload(apkUrl: string): void {
  const link = document.createElement('a');
  link.href = apkUrl;
  link.download = ANDROID_APK_FILENAME;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
