import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { clsx } from 'clsx';

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

/** ⋮ row actions — keeps tables uncluttered while preserving all actions. */
export function RowActionsMenu({
  actions,
  ariaLabel = 'Row actions',
  align = 'end',
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="sx-btn w-9 h-9 rounded-xl border border-sx-border bg-white text-slate-500 hover:text-sx-primary hover:border-sx-primary/20 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 flex items-center justify-center"
      >
        <MoreVertical size={16} />
      </button>
      {open ? (
        <div
          className={clsx(
            'sx-dropdown absolute z-50 mt-1 min-w-[168px] rounded-xl border border-sx-border bg-sx-card py-1 shadow-lg',
            'dark:border-slate-700 dark:bg-slate-900',
            align === 'end' ? 'end-0' : 'start-0',
          )}
        >
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                onClick={() => {
                  setOpen(false);
                  action.onClick();
                }}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-left rtl:text-right transition-colors',
                  action.destructive
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                    : 'text-sx-text hover:bg-sx-surface dark:text-slate-200 dark:hover:bg-slate-800',
                  action.disabled && 'opacity-40 cursor-not-allowed',
                )}
              >
                {Icon ? <Icon size={15} className="shrink-0 opacity-70" /> : null}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
