import React from 'react';
import { cn } from '../../lib/cn';

export function Panel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('sq-panel', className)} {...props}>
      {children}
    </div>
  );
}

export function PanelToolbar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('sq-panel-toolbar', className)} {...props}>
      {children}
    </div>
  );
}
