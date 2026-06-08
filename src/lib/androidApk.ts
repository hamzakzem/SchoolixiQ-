/** Default same-origin APK path (file must exist at public/downloads/schoolixiq.apk). */
export const DEFAULT_ANDROID_APK_PATH = '/downloads/schoolixiq.apk';

/** Resolved Android APK download URL: build-time env override or same-origin default. */
export function getAndroidApkDownloadUrl(): string {
  const envUrl = String(import.meta.env.VITE_ANDROID_APK_URL || '').trim();
  if (envUrl) return envUrl;
  return DEFAULT_ANDROID_APK_PATH;
}

/** True when CI/build injected an external APK URL (not relying on hosted file). */
export function hasConfiguredAndroidApkUrl(): boolean {
  return Boolean(String(import.meta.env.VITE_ANDROID_APK_URL || '').trim());
}
