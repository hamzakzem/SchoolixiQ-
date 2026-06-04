import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  isIosInstallDeepLink,
  isIosDevice,
  clearIosInstallQueryFromUrl,
  getIosInstallGuideUrl,
} from '../lib/iosAppDownload';

/** على iPhone يفتح صفحة تعليمات التثبيت (Safari → الشاشة الرئيسية) */
export function dispatchIosInstallPrompt(): void {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return;
  window.dispatchEvent(new CustomEvent('schoolix:ios-install-prompt'));
}

export default function IosInstallDeepLink() {
  useEffect(() => {
    if (Capacitor.isNativePlatform() || !isIosInstallDeepLink()) return;

    if (isIosDevice()) {
      clearIosInstallQueryFromUrl();
      window.location.assign(getIosInstallGuideUrl());
      return;
    }

    const t = window.setTimeout(() => dispatchIosInstallPrompt(), 400);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
