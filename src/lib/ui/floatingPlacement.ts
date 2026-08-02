/**
 * Viewport-aware placement for floating menus / popovers.
 * Presentation only — no business logic.
 */

export type FloatingAlign = 'start' | 'end';
export type FloatingSide = 'bottom' | 'top';

export type FloatingPlacement = {
  side: FloatingSide;
  align: FloatingAlign;
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  useSheet: boolean;
};

const VIEWPORT_PAD = 8;
const SHEET_BREAKPOINT = 640;

export function shouldUseMenuSheet(
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024,
): boolean {
  return viewportWidth < SHEET_BREAKPOINT;
}

export function computeFloatingPlacement(options: {
  anchor: DOMRect;
  menuWidth: number;
  menuHeight: number;
  align?: FloatingAlign;
  preferredSide?: FloatingSide;
  minWidth?: number;
  maxWidth?: number;
  viewportPad?: number;
  /** When false, never switch to bottom sheet even on mobile. */
  allowSheet?: boolean;
}): FloatingPlacement {
  const {
    anchor,
    menuHeight,
    align = 'end',
    preferredSide = 'bottom',
    minWidth = 180,
    maxWidth = 320,
    viewportPad = VIEWPORT_PAD,
    allowSheet = true,
  } = options;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

  if (allowSheet && shouldUseMenuSheet(vw)) {
    return {
      side: 'bottom',
      align,
      top: 0,
      left: 0,
      width: vw,
      maxHeight: Math.min(vh * 0.72, 480),
      useSheet: true,
    };
  }

  const width = Math.min(
    maxWidth,
    Math.max(minWidth, options.menuWidth || minWidth, Math.min(anchor.width, maxWidth)),
    vw - viewportPad * 2,
  );

  const spaceBelow = vh - anchor.bottom - viewportPad;
  const spaceAbove = anchor.top - viewportPad;

  let side: FloatingSide = preferredSide;
  if (preferredSide === 'bottom') {
    if (spaceBelow < Math.min(menuHeight, 220) && spaceAbove > spaceBelow) {
      side = 'top';
    }
  } else if (spaceAbove < Math.min(menuHeight, 220) && spaceBelow >= spaceAbove) {
    side = 'bottom';
  }

  const available = side === 'bottom' ? spaceBelow : spaceAbove;
  const maxHeight = Math.max(140, Math.min(available, Math.min(vh * 0.7, 420)));

  let left = align === 'end' ? anchor.right - width : anchor.left;
  left = Math.min(Math.max(viewportPad, left), vw - width - viewportPad);

  const usedHeight = Math.min(menuHeight || maxHeight, maxHeight);
  let top =
    side === 'bottom' ? anchor.bottom + 6 : anchor.top - usedHeight - 6;
  top = Math.min(Math.max(viewportPad, top), vh - Math.min(usedHeight, maxHeight) - viewportPad);

  return {
    side,
    align,
    top,
    left,
    width,
    maxHeight,
    useSheet: false,
  };
}
