import React from 'react';
import { cn } from '../../lib/cn';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  tone?: 'default' | 'primary' | 'danger';
}

export function IconButton({
  active = false,
  tone = 'default',
  className,
  type = 'button',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'sq-icon-btn',
        tone === 'primary' && 'sq-icon-btn-primary',
        tone === 'danger' && 'sq-icon-btn-danger',
        active && 'sq-icon-btn-active',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
