import React, { useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IconButton } from './IconButton';
import { cn } from '../../lib/cn';

export interface ActionMenuProps {
  menuId: string;
  activeId: string | null;
  onToggle: (id: string | null) => void;
  children: React.ReactNode;
  align?: 'start' | 'end';
  placement?: 'below' | 'overlay';
  className?: string;
  menuClassName?: string;
}

export function ActionMenu({
  menuId,
  activeId,
  onToggle,
  children,
  align = 'end',
  placement = 'below',
  className,
  menuClassName,
}: ActionMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isOpen = activeId === menuId;

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onToggle(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggle(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onToggle]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <IconButton
        active={isOpen}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="المزيد من الإجراءات"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(isOpen ? null : menuId);
        }}
      >
        <MoreVertical size={18} />
      </IconButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'sq-action-menu',
              align === 'start' ? 'left-0' : 'right-0',
              placement === 'below' ? 'top-full mt-2' : 'top-12',
              menuClassName
            )}
          >
            <div className="p-1.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ActionMenuItem({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" role="menuitem" className={cn('sq-action-menu-item', className)} {...props}>
      {children}
    </button>
  );
}

export function ActionMenuDivider() {
  return <div className="h-px bg-slate-100 dark:bg-slate-700 my-1.5 mx-2" />;
}
