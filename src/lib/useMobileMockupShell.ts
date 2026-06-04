import { Capacitor } from '@capacitor/core';

/**
 * Premium in-app shell (header, bottom nav, mockup homes) — **Capacitor native only**.
 * Mobile browser / website keeps the classic dashboard UI.
 * Set VITE_MOBILE_MOCKUP_UI=true in dev to preview the app UI in a desktop browser.
 */
export function useMobileMockupShell(): boolean {
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
