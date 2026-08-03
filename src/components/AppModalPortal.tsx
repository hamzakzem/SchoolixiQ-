import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { prefersReducedMotion } from '../lib/motion';

export interface AppModalPortalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  dir?: 'rtl' | 'ltr';
  /** sm = max-w-sm, md = max-w-lg, lg = max-w-2xl, xl = near-fullscreen workspace */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  ariaLabel?: string;
}

export function AppModalPortal({
  open,
  onClose,
  children,
  dir = 'rtl',
  size = 'lg',
  ariaLabel,
}: AppModalPortalProps) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  const reduced = prefersReducedMotion();
  const panelMotion = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { y: '100%', opacity: 1 },
        animate: { y: 0, opacity: 1 },
        exit: { y: '100%', opacity: 1 },
        transition: { type: 'spring' as const, stiffness: 320, damping: 32 },
      };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className="sx-app-modal-root"
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          onClick={onClose}
        >
          <button
            type="button"
            className="sx-app-modal-backdrop"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            {...panelMotion}
            className={`sx-app-modal-panel sx-app-modal-panel--${size}`}
            dir={dir}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
