import { Capacitor } from '@capacitor/core';

let initialized = false;

/** Run once on app start — uses capacitor.config + strings.xml server_client_id */
export async function initNativeGoogleAuth(): Promise<void> {
  if (!Capacitor.isNativePlatform() || initialized) return;
  try {
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    await GoogleAuth.initialize();
    initialized = true;
  } catch (err) {
    console.warn('[GoogleAuth] native initialize:', err);
  }
}
