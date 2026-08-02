import React, { useId, useRef } from 'react';
import { FloatingMenu, FloatingMenuItem } from './FloatingMenu';
import type { FloatingAlign, FloatingSide } from '../../lib/ui/floatingPlacement';

export type ActionMenuItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
};

type ActionMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ActionMenuItem[];
  /** Render the trigger; receives button props to wire ref + a11y. */
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>;
    onClick: (e: React.MouseEvent) => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'menu';
    'aria-controls': string;
  }) => React.ReactNode;
  align?: FloatingAlign;
  preferredSide?: FloatingSide;
  ariaLabel?: string;
  minWidth?: number;
  maxWidth?: number;
  header?: React.ReactNode;
};

/**
 * Trigger + portal menu. Drop-in for absolute-positioned ⋮ menus that get clipped.
 */
export function ActionMenu({
  open,
  onOpenChange,
  items,
  trigger,
  align = 'end',
  preferredSide = 'bottom',
  ariaLabel = 'Actions',
  minWidth = 200,
  maxWidth = 300,
  header,
}: ActionMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const visible = items.filter((i) => !i.hidden);

  return (
    <>
      {trigger({
        ref: triggerRef,
        onClick: (e) => {
          e.stopPropagation();
          onOpenChange(!open);
        },
        'aria-expanded': open,
        'aria-haspopup': 'menu',
        'aria-controls': menuId,
      })}
      <FloatingMenu
        id={menuId}
        open={open}
        onClose={() => onOpenChange(false)}
        anchorRef={triggerRef}
        align={align}
        preferredSide={preferredSide}
        ariaLabel={ariaLabel}
        minWidth={minWidth}
        maxWidth={maxWidth}
      >
        {header}
        {visible.map((item) => (
          <FloatingMenuItem
            key={item.id}
            icon={item.icon}
            disabled={item.disabled}
            destructive={item.destructive}
            onClick={() => {
              onOpenChange(false);
              item.onClick();
            }}
          >
            {item.label}
          </FloatingMenuItem>
        ))}
      </FloatingMenu>
    </>
  );
}
