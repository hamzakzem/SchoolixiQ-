/** Shared motion tokens — Linear / Stripe style: subtle, fast, GPU-friendly. */

export const MOTION_DURATION = {
  fast: 0.15,
  base: 0.2,
  slow: 0.25,
} as const;

export const MOTION_EASE = [0.4, 0, 0.2, 1] as const;

export const MOTION_SPRING = {
  drawer: { type: 'spring' as const, stiffness: 280, damping: 28 },
  indicator: { type: 'spring' as const, stiffness: 300, damping: 30 },
};

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function pageTransitionProps(isChat = false) {
  if (prefersReducedMotion()) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.01 },
    };
  }
  return {
    initial: { opacity: 0, y: isChat ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: isChat ? 0 : -8 },
    transition: { duration: MOTION_DURATION.slow, ease: MOTION_EASE },
  };
}

export function modalBackdropProps() {
  return prefersReducedMotion()
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.01 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: MOTION_DURATION.base } };
}

export function modalPanelProps() {
  return prefersReducedMotion()
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.01 } }
    : {
        initial: { opacity: 0, scale: 0.98, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98, y: 8 },
        transition: { duration: MOTION_DURATION.slow, ease: MOTION_EASE },
      };
}

export function drawerPanelProps(fromBottom = true) {
  if (prefersReducedMotion()) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.01 },
    };
  }
  return fromBottom
    ? {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: MOTION_SPRING.drawer,
      }
    : {
        initial: { x: -24, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: -24, opacity: 0 },
        transition: { duration: MOTION_DURATION.slow, ease: MOTION_EASE },
      };
}
