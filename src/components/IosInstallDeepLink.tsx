import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { isIosInstallDeepLink, isIosDevice } from '../lib/iosAppDownload';

/** يعرض بانر التثبيت فوراً عند فتح /?install=ios من رابط التحميل */
export function dispatchIosInstallPrompt(): void {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return;
  window.dispatchEvent(new CustomEvent('schoolix:ios-install-prompt'));
}

export default function IosInstallDeepLink() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!isIosInstallDeepLink()) return;
    if (!isIosDevice()) return;
    const t = window.setTimeout(() => dispatchIosInstallPrompt(), 400);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
