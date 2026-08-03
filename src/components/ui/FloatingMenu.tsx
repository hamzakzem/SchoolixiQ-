import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import {
  computeFloatingPlacement,
  type FloatingAlign,
  type FloatingPlacement,
  type FloatingSide,
} from '../../lib/ui/floatingPlacement';

export type FloatingMenuProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  align?: FloatingAlign;
  preferredSide?: FloatingSide;
  minWidth?: number;
  maxWidth?: number;
  /** On narrow screens, render as a bottom sheet (default true). */
  mobileSheet?: boolean;
  role?: 'menu' | 'listbox' | 'dialog';
  className?: string;
  id?: string;
  ariaLabel?: string;
  /** Focus first actionable item on open (default true). Disable for search-anchored panels. */
  autoFocus?: boolean;
};

/**
 * Unified floating menu: portals to document.body, never clipped by overflow parents,
 * smart top/bottom placement, mobile bottom sheet, Escape + outside click + arrow keys.
 */
export function FloatingMenu({
  open,
  onClose,
  anchorRef,
  children,
  align = 'end',
  preferredSide = 'bottom',
  minWidth = 188,
  maxWidth = 300,
  mobileSheet = true,
  role = 'menu',
  className,
  id,
  ariaLabel,
  autoFocus = true,
}: FloatingMenuProps) {
  const autoId = useId();
  const menuId = id || autoId;
  const menuRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<FloatingPlacement | null>(null);

  const updatePlacement = useCallback(() => {
    const anchorEl = anchorRef.current;
    if (!anchorEl || typeof window === 'undefined') return;

    const rect = anchorEl.getBoundingClientRect();
    const menuEl = menuRef.current;
    const measuredW = menuEl?.offsetWidth || minWidth;
    const measuredH = menuEl?.offsetHeight || 240;

    setPlacement(
      computeFloatingPlacement({
        anchor: rect,
        menuWidth: measuredW,
        menuHeight: measuredH,
        align,
        preferredSide,
        minWidth,
        maxWidth,
        allowSheet: mobileSheet,
      }),
    );
  }, [align, anchorRef, maxWidth, minWidth, mobileSheet, preferredSide]);

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    updatePlacement();
    const raf = requestAnimationFrame(updatePlacement);
    return () => cancelAnimationFrame(raf);
  }, [open, updatePlacement, children]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') {
        return;
      }
      const root = menuRef.current;
      if (!root) return;
      const items = Array.from(
        root.querySelectorAll<HTMLElement>(
          '[role="menuitem"]:not([disabled]), [role="option"]:not([disabled]), button:not([disabled])',
        ),
      );
      if (items.length === 0) return;
      e.preventDefault();
      const idx = items.indexOf(document.activeElement as HTMLElement);
      let next = idx;
      if (e.key === 'ArrowDown') next = idx < 0 ? 0 : (idx + 1) % items.length;
      if (e.key === 'ArrowUp') next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = items.length - 1;
      items[next]?.focus();
    };

    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer, { passive: true });
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);

    const t = autoFocus
      ? window.setTimeout(() => {
          const first = menuRef.current?.querySelector<HTMLElement>(
            '[role="menuitem"]:not([disabled]), [role="option"]:not([disabled]), button:not([disabled])',
          );
          first?.focus();
        }, 20)
      : null;

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
      if (t != null) window.clearTimeout(t);
    };
  }, [open, onClose, anchorRef, updatePlacement, autoFocus]);

  if (!open || typeof document === 'undefined') return null;

  const useSheet = Boolean(placement?.useSheet);

  const panel = (
    <div
      ref={menuRef}
      id={menuId}
      role={role}
      aria-label={ariaLabel}
      className={clsx(
        useSheet ? 'sx-floating-menu sx-floating-menu--sheet' : 'sx-floating-menu sx-floating-menu--anchored',
        className,
      )}
      style={
        useSheet || !placement
          ? undefined
          : {
              top: placement.top,
              left: placement.left,
              width: placement.width,
              maxHeight: placement.maxHeight,
            }
      }
      data-side={placement?.side || preferredSide}
      data-align={placement?.align || align}
    >
      {useSheet ? <div className="sx-floating-menu__grab" aria-hidden /> : null}
      <div className="sx-floating-menu__scroll">{children}</div>
    </div>
  );

  return createPortal(
    useSheet ? (
      <div className="sx-floating-menu-root" role="presentation">
        <button
          type="button"
          className="sx-floating-menu__backdrop"
          aria-label="Close"
          onClick={onClose}
        />
        {panel}
      </div>
    ) : (
      panel
    ),
    document.body,
  );
}

export function FloatingMenuItem({
  children,
  onClick,
  destructive,
  disabled,
  className,
  icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={clsx(
        'sx-floating-menu__item',
        destructive && 'sx-floating-menu__item--danger',
        disabled && 'sx-floating-menu__item--disabled',
        className,
      )}
      onClick={onClick}
    >
      {icon ? <span className="sx-floating-menu__item-icon">{icon}</span> : null}
      <span className="sx-floating-menu__item-label">{children}</span>
    </button>
  );
}
