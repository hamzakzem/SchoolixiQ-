import React, { useId, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { FloatingMenu, FloatingMenuItem } from './FloatingMenu';

export type RowActionItem = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

type RowActionsMenuProps = {
  actions: RowActionItem[];
  ariaLabel?: string;
  align?: 'start' | 'end';
};

/** ⋮ row actions — portal menu; never clipped by table overflow. */
export function RowActionsMenu({
  actions,
  ariaLabel = 'Row actions',
  align = 'end',
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  if (actions.length === 0) return null;

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="sx-btn w-10 h-10 rounded-xl border border-sx-border bg-white text-slate-500 hover:text-sx-primary hover:border-sx-primary/20 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 flex items-center justify-center"
      >
        <MoreVertical size={16} />
      </button>
      <FloatingMenu
        id={menuId}
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        align={align}
        ariaLabel={ariaLabel}
        minWidth={188}
        maxWidth={280}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <FloatingMenuItem
              key={action.id}
              disabled={action.disabled}
              destructive={action.destructive}
              icon={Icon ? <Icon size={15} /> : undefined}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
            >
              {action.label}
            </FloatingMenuItem>
          );
        })}
      </FloatingMenu>
    </div>
  );
}
