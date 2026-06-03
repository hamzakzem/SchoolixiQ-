import React from 'react';
import { cn } from '../../lib/cn';

export interface DataTableProps {
  children: React.ReactNode;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
}

export function DataTable({
  children,
  className,
  minHeight = 'min(52vh, 420px)',
  maxHeight = 'calc(100dvh - 16rem)',
}: DataTableProps) {
  return (
    <div
      className={cn('sq-table-wrap custom-scrollbar', className)}
      style={{ minHeight, maxHeight }}
    >
      {children}
    </div>
  );
}

export function DataTableElement({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('sq-table', className)} {...props}>
      {children}
    </table>
  );
}
