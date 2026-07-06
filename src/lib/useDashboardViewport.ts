import { useEffect, useState } from 'react';

export { useDevice, MOBILE_MAX_PX, TABLET_MIN_PX, DESKTOP_MIN_PX } from './useDevice';

/** @deprecated Prefer useDevice().isDesktop — kept for legacy call sites */
export function useIsLgUp() {
  const [isLgUp, setIsLgUp] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = () => setIsLgUp(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isLgUp;
}
