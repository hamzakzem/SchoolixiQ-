import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/** Mockup UI from design reference — native app + mobile viewport. */
export function useMobileMockupShell(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const native = Capacitor.isNativePlatform();
  const forced =
    import.meta.env.VITE_MOBILE_MOCKUP_UI === '1' ||
    import.meta.env.VITE_MOBILE_MOCKUP_UI === 'true';
  const disabled =
    import.meta.env.VITE_MOBILE_MOCKUP_UI === '0' ||
    import.meta.env.VITE_MOBILE_MOCKUP_UI === 'false';

  if (disabled) return false;
  if (forced) return true;
  return native || narrow;
}
