import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  containerClassName?: string;
}

export function SearchField({ className, containerClassName, ...props }: SearchFieldProps) {
  return (
    <div className={cn('sq-search', containerClassName)}>
      <Search className="sq-search-icon" size={18} aria-hidden />
      <input type="search" className={cn('sq-search-input', className)} {...props} />
    </div>
  );
}
