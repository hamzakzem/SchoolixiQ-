import React from 'react';
import { clsx } from 'clsx';

type UiCardProps = {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  as?: 'div' | 'section' | 'article';
};

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5 md:p-6',
  lg: 'p-6 md:p-8',
};

/** Premium SaaS card — white surface, calm border, optional hover lift. */
export function UiCard({
  children,
  className,
  padding = 'md',
  hover = false,
  as: Tag = 'div',
}: UiCardProps) {
  return (
    <Tag
      className={clsx(
        'sx-card rounded-2xl border border-sx-border bg-sx-card text-sx-text shadow-sm',
        'dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
        paddingMap[padding],
        hover && 'cursor-default',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function UiCardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex items-start justify-between gap-4 mb-4 pb-4 border-b border-sx-border dark:border-slate-800',
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-sx-text dark:text-white truncate">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
