import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

const controlClass = 'sq-form-control';

export function LabeledField({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('sq-form-field', className)}>
      <span className="sq-form-label">
        {label}
        {required && <span className="text-red-500 mr-0.5" aria-hidden>*</span>}
      </span>
      {hint && <p className="sq-form-hint">{hint}</p>}
      {children}
    </div>
  );
}

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  ltr?: boolean;
}

export function FormInput({ icon: Icon, ltr, className, ...props }: FormInputProps) {
  return (
    <div className="sq-form-input-wrap">
      {Icon && <Icon className="sq-form-input-icon" size={18} aria-hidden />}
      <input
        className={cn(controlClass, Icon && 'sq-form-control-with-icon', ltr && 'text-left font-mono', className)}
        dir={ltr ? 'ltr' : undefined}
        {...props}
      />
    </div>
  );
}

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: LucideIcon;
}

export function FormSelect({ icon: Icon, className, children, ...props }: FormSelectProps) {
  return (
    <div className="sq-form-input-wrap">
      {Icon && <Icon className="sq-form-input-icon" size={18} aria-hidden />}
      <select className={cn(controlClass, Icon && 'sq-form-control-with-icon', className)} {...props}>
        {children}
      </select>
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('sq-form-section', className)}>
      <div className="sq-form-section-head">
        <h3 className="sq-form-section-title">{title}</h3>
        {description && <p className="sq-form-section-desc">{description}</p>}
      </div>
      <div className="sq-form-grid">{children}</div>
    </section>
  );
}
