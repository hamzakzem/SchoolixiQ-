import { Capacitor } from '@capacitor/core';

/** True only inside the installed Capacitor shell (Android/iOS), never in a normal browser tab. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function isInIframe(): boolean {
  return typeof window !== 'undefined' && window.self !== window.top;
}

/** WhatsApp, Instagram, Facebook, Telegram, etc. */
export function isInAppWebView(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua =
    window.navigator.userAgent ||
    window.navigator.vendor ||
    (window as Window & { opera?: string }).opera ||
    '';

  return (
    /FB_IAB|FBAN|FBAV|Instagram|Telegram|Twitter|Line|LinkedInApp|Messenger|WhatsApp|wv|Webview|CocCoc|MicroMessenger/i.test(
      ua,
    ) ||
    (ua.includes('Android') && ua.includes('Version/')) ||
    (ua.includes('iPhone') &&
      !ua.includes('Safari/') &&
      !ua.includes('CriOS') &&
      !ua.includes('FxiOS'))
  );
}

export function openAndroidChromeIntent(): void {
  if (typeof window === 'undefined') return;
  const currentUrlNoScheme = window.location.href.replace(/^https?:\/\//, '');
  const intentUrl = `intent://${currentUrlNoScheme}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
  window.location.href = intentUrl;
}
