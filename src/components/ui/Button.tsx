import React from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'sq-btn-primary',
  secondary: 'sq-btn-secondary',
  ghost: 'sq-btn-ghost',
  danger: 'sq-btn-danger',
  accent: 'sq-btn-accent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'sq-btn-sm',
  md: 'sq-btn-md',
  lg: 'sq-btn-lg',
  icon: 'sq-btn-icon',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'sq-btn',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
