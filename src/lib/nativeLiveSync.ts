import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const BUILD_ID_KEY = 'schoolixiq_native_build_id';

function getSiteOrigin(): string {
  const fromEnv = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://schoolixiq.com';
}

/** Fetch production index and compare sq-build meta with last seen in app. */
export async function checkForRemoteSiteUpdate(): Promise<boolean> {
  try {
    const res = await fetch(`${getSiteOrigin()}/`, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!res.ok) return false;
    const html = await res.text();
    const match = html.match(/<meta\s+name="sq-build"\s+content="([^"]+)"/i);
    const remoteBuild = match?.[1];
    if (!remoteBuild) return false;

    const localBuild = sessionStorage.getItem(BUILD_ID_KEY);
    if (localBuild && localBuild !== remoteBuild) {
      sessionStorage.setItem(BUILD_ID_KEY, remoteBuild);
      return true;
    }
    sessionStorage.setItem(BUILD_ID_KEY, remoteBuild);
    return false;
  } catch {
    return false;
  }
}

/** Reload native shell when the live site was redeployed. */
export function initNativeLiveSync(): void {
  if (!Capacitor.isNativePlatform()) return;

  const maybeReload = async () => {
    if (await checkForRemoteSiteUpdate()) {
      window.location.reload();
    }
  };

  void App.addListener('resume', () => {
    void maybeReload();
  });

  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) void maybeReload();
  });

  window.setTimeout(() => void maybeReload(), 2500);
}
