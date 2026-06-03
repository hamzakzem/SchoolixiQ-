import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IconButton } from './IconButton';
import { cn } from '../../lib/cn';

const MENU_WIDTH = 224;
const MENU_MAX_HEIGHT = 320;

export interface ActionMenuProps {
  menuId: string;
  activeId: string | null;
  onToggle: (id: string | null) => void;
  children: React.ReactNode;
  align?: 'start' | 'end';
  className?: string;
  menuClassName?: string;
}

export function ActionMenu({
  menuId,
  activeId,
  onToggle,
  children,
  align = 'end',
  className,
  menuClassName,
}: ActionMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isOpen = activeId === menuId;
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean } | null>(null);

  const updatePosition = () => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < MENU_MAX_HEIGHT && rect.top > MENU_MAX_HEIGHT;

    let left =
      align === 'end'
        ? rect.right - MENU_WIDTH
        : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8));

    const top = openUp ? rect.top : rect.bottom + 8;
    setCoords({ top, left, openUp });
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, align]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      const portal = document.getElementById(`sq-menu-${menuId}`);
      if (portal?.contains(target)) return;
      onToggle(null);
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
  }, [isOpen, menuId, onToggle]);

  const menuPortal =
    isOpen &&
    coords &&
    createPortal(
      <AnimatePresence>
        <motion.div
          id={`sq-menu-${menuId}`}
          role="menu"
          initial={{ opacity: 0, y: align === 'end' ? -4 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.12 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: MENU_WIDTH,
            maxHeight: MENU_MAX_HEIGHT,
            zIndex: 9999,
            transform: coords.openUp ? 'translateY(calc(-100% - 8px))' : undefined,
          }}
          className={cn(
            'sq-action-menu-portal overflow-y-auto custom-scrollbar',
            menuClassName
          )}
        >
          <div className="p-1.5">{children}</div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );

  return (
    <div ref={rootRef} className={cn('relative shrink-0', className)}>
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
      {menuPortal}
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
