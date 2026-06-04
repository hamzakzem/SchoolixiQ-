import { Capacitor } from '@capacitor/core';

/**
 * True only in the **native SchoolixiQ app** (Capacitor Android/iOS).
 *
 * - Website (desktop or mobile browser): always `false` → classic sidebar/header UI.
 * - App: `true` → mobile shell (header, bottom nav, IdCardsAppView, compact admin pages, …).
 *
 * Dev preview only: `VITE_MOBILE_MOCKUP_UI=true` simulates the app in a browser.
 * Production web builds must not set that variable.
 */
export function isNativeAppPlatform(): boolean {
  const forced =
    import.meta.env.VITE_MOBILE_MOCKUP_UI === '1' ||
    import.meta.env.VITE_MOBILE_MOCKUP_UI === 'true';
  const disabled =
    import.meta.env.VITE_MOBILE_MOCKUP_UI === '0' ||
    import.meta.env.VITE_MOBILE_MOCKUP_UI === 'false';

  if (disabled) return false;
  if (forced) return true;
  return Capacitor.isNativePlatform();
}

/** React hook — same as {@link isNativeAppPlatform}. */
export function useMobileMockupShell(): boolean {
  return isNativeAppPlatform();
}
