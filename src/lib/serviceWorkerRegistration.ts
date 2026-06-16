/** Single service worker URL — FCM token must bind to the same script as PWA registration. */
export const SW_BUILD_VERSION = '2026-06-03-v12';

export function getServiceWorkerUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    return `/sw.js?build=${SW_BUILD_VERSION}`;
  }
  return '/sw.js';
}
