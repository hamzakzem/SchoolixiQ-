import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  isIosInstallDeepLink,
  isIosDevice,
  isIosSafari,
  clearIosInstallQueryFromUrl,
  promptIosSafariInstallUI,
  getIosInstallGuideUrl,
} from '../lib/iosAppDownload';

export function dispatchIosInstallPrompt(): void {
  promptIosSafariInstallUI();
}

export default function IosInstallDeepLink() {
  useEffect(() => {
    if (Capacitor.isNativePlatform() || !isIosInstallDeepLink()) return;

    clearIosInstallQueryFromUrl();

    if (isIosDevice() && isIosSafari()) {
      const t = window.setTimeout(() => promptIosSafariInstallUI(), 300);
      return () => window.clearTimeout(t);
    }

    if (isIosDevice()) {
      window.location.assign(getIosInstallGuideUrl());
    }
  }, []);

  return null;
}
