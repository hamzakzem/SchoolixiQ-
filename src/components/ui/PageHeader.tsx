import React from 'react';
import { cn } from '../../lib/cn';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('sq-page-header', className)}>
      <div className="min-w-0">
        <h1 className="sq-page-title">{title}</h1>
        {description && <p className="sq-page-desc">{description}</p>}
      </div>
      {actions && <div className="sq-page-actions">{actions}</div>}
    </div>
  );
}
