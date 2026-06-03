import React from 'react';
import { cn } from '../../lib/cn';

export interface ViewToggleOption<T extends string> {
  value: T;
  label: string;
}

export interface ViewToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ViewToggleOption<T>[];
  className?: string;
}

export function ViewToggle<T extends string>({
  value,
  onChange,
  options,
  className,
}: ViewToggleProps<T>) {
  return (
    <div className={cn('sq-view-toggle', className)} role="tablist" aria-label="طريقة العرض">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn('sq-view-toggle-btn', value === opt.value && 'sq-view-toggle-btn-active')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
