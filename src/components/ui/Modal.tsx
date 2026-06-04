import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/cn';
import { IconButton } from './IconButton';
import { useMobileMockupShell } from '../../lib/useMobileMockupShell';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  maxWidthClass = 'max-w-xl',
}: ModalProps) {
  const inApp = useMobileMockupShell();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            'sq-modal-backdrop',
            inApp && 'sq-modal-backdrop--app',
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sq-modal-title"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: inApp ? 40 : 16, scale: inApp ? 1 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: inApp ? 40 : 16, scale: inApp ? 1 : 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={cn(
              'sq-modal',
              inApp && 'sq-modal--app',
              inApp ? 'max-w-none sm:max-w-lg' : maxWidthClass,
            )}
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="sq-modal-header">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {icon && <div className="sq-modal-icon shrink-0">{icon}</div>}
                <div className="min-w-0">
                  <h2 id="sq-modal-title" className="sq-modal-title">
                    {title}
                  </h2>
                  {description && <p className="sq-modal-desc">{description}</p>}
                </div>
              </div>
              <IconButton
                type="button"
                aria-label="إغلاق"
                onClick={onClose}
                className="shrink-0"
              >
                <X size={18} />
              </IconButton>
            </header>

            <div className="sq-modal-body custom-scrollbar">{children}</div>

            {footer && <footer className="sq-modal-footer">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
