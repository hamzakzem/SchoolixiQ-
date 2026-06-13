import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

type UiEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
};

/** Calm empty state for lists, tables, and dashboard panels. */
export function UiEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: UiEmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-sx-border',
        'bg-sx-surface/50 dark:border-slate-700 dark:bg-slate-900/40',
        compact ? 'py-10 px-6' : 'py-16 px-8',
        className,
      )}
    >
      <div
        className={clsx(
          'rounded-2xl bg-sx-surface border border-sx-border flex items-center justify-center mb-4',
          'dark:bg-slate-800 dark:border-slate-700',
          compact ? 'w-12 h-12' : 'w-16 h-16',
        )}
      >
        <Icon
          className="text-slate-400 dark:text-slate-500"
          size={compact ? 22 : 28}
          strokeWidth={1.5}
        />
      </div>
      <h3 className="text-sm font-bold text-sx-text dark:text-white mb-1">
        {title}
      </h3>
      {description ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
