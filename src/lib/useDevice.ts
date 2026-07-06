import { useEffect, useState } from 'react';

export const MOBILE_MAX_PX = 767;
export const TABLET_MIN_PX = 768;
export const DESKTOP_MIN_PX = 1024;

function readViewport() {
  if (typeof window === 'undefined') {
    return { width: DESKTOP_MIN_PX, isMobile: false, isTablet: false, isDesktop: true };
  }
  const width = window.innerWidth;
  return {
    width,
    isMobile: width < TABLET_MIN_PX,
    isTablet: width >= TABLET_MIN_PX && width < DESKTOP_MIN_PX,
    isDesktop: width >= DESKTOP_MIN_PX,
  };
}

/** Responsive layout: mobile <768, tablet 768–1023, desktop ≥1024 */
export function useDevice() {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    const mqMobile = window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`);
    const mqTablet = window.matchMedia(
      `(min-width: ${TABLET_MIN_PX}px) and (max-width: ${DESKTOP_MIN_PX - 1}px)`,
    );
    const sync = () => setViewport(readViewport());
    sync();
    mqMobile.addEventListener('change', sync);
    mqTablet.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    return () => {
      mqMobile.removeEventListener('change', sync);
      mqTablet.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  return viewport;
}
