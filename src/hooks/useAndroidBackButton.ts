import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Wires the native Android hardware back button to an in-app handler.
 *
 * `handler` should return `true` if it consumed the back action (i.e. it
 * navigated within the app). When it returns `false` (or there is nowhere to
 * go back to), the app is minimized via `App.minimizeApp()` instead of being
 * killed, matching standard Android behavior.
 *
 * No-ops on the web, so it's safe to call unconditionally from any dashboard.
 */
export function useAndroidBackButton(handler: () => boolean) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    let removeListener: (() => void) | undefined;

    const listenerPromise = App.addListener('backButton', () => {
      const consumed = handler();
      if (!consumed) {
        App.minimizeApp();
      }
    });

    listenerPromise.then((listener) => {
      removeListener = () => listener.remove();
    });

    return () => {
      removeListener?.();
    };
  }, [handler]);
}
