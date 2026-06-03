import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/cn';
import { IconButton } from './IconButton';

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
  return (
    <AnimatePresence>
      {open && (
        <div
          className="sq-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sq-modal-title"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className={cn('sq-modal', maxWidthClass)}
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
              <IconButton type="button" aria-label="إغلاق" onClick={onClose} className="shrink-0">
                <X size={18} />
              </IconButton>
            </header>

            <div className="sq-modal-body custom-scrollbar">{children}</div>

            {footer && <footer className="sq-modal-footer">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
