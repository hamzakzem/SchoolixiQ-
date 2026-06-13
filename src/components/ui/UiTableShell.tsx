import React from 'react';
import { clsx } from 'clsx';

type UiTableShellProps = {
  children: React.ReactNode;
  className?: string;
};

/** Scrollable table container with premium admin styling. */
export function UiTableShell({ children, className }: UiTableShellProps) {
  return (
    <div
      className={clsx(
        'sx-table-shell overflow-x-auto rounded-2xl border border-sx-border bg-sx-card',
        'dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function UiTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <table className={clsx('w-full text-sm text-left rtl:text-right', className)}>
      {children}
    </table>
  );
}

export function UiTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-sx-surface border-b border-sx-border dark:bg-slate-800/80 dark:border-slate-700">
      {children}
    </thead>
  );
}

export function UiTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={clsx(
        'sx-table-row border-b border-sx-border/70 last:border-0',
        'dark:border-slate-800 hover:bg-sx-surface/80 dark:hover:bg-slate-800/50',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function UiTableCell({
  children,
  className,
  header,
}: {
  children: React.ReactNode;
  className?: string;
  header?: boolean;
}) {
  const Tag = header ? 'th' : 'td';
  return (
    <Tag
      className={clsx(
        header
          ? 'px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap'
          : 'px-4 py-3.5 text-sx-text dark:text-slate-200 align-middle',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
