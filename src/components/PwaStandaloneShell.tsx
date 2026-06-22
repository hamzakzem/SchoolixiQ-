import { useEffect } from 'react';
import { applyPwaStandaloneBodyClass } from '../lib/pwaUtils';

/** Applies `pwa-standalone` body class and keeps it in sync with display mode. */
export function PwaStandaloneShell() {
  useEffect(() => {
    applyPwaStandaloneBodyClass();

    const media = window.matchMedia('(display-mode: standalone)');
    const onChange = () => applyPwaStandaloneBodyClass();
    media.addEventListener?.('change', onChange);
    window.addEventListener('appinstalled', onChange);

    return () => {
      media.removeEventListener?.('change', onChange);
      window.removeEventListener('appinstalled', onChange);
    };
  }, []);

  return null;
}
