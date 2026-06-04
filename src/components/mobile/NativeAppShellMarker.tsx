import { useEffect } from 'react';
import { useMobileMockupShell } from '../../lib/useMobileMockupShell';

/**
 * Sets `data-sq-native-app` on <html> only inside the Capacitor app.
 * Website / mobile browser never get this flag (unless VITE_MOBILE_MOCKUP_UI preview).
 */
export default function NativeAppShellMarker() {
  const inApp = useMobileMockupShell();

  useEffect(() => {
    if (inApp) {
      document.documentElement.setAttribute('data-sq-native-app', 'true');
    } else {
      document.documentElement.removeAttribute('data-sq-native-app');
    }
    return () => document.documentElement.removeAttribute('data-sq-native-app');
  }, [inApp]);

  return null;
}
