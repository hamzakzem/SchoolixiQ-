import React from 'react';

type SkeletonProps = {
  className?: string;
  rounded?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
};

const roundedMap = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

export function Skeleton({ className = '', rounded = 'xl' }: SkeletonProps) {
  return (
    <div
      className={`sx-skeleton ${roundedMap[rounded]} ${className}`}
      aria-hidden="true"
    />
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 sx-fade-in flex flex-col" aria-busy="true" aria-label="Loading">
      <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center gap-4">
        <Skeleton className="w-10 h-10" rounded="2xl" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" rounded="2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" rounded="2xl" />
        <Skeleton className="h-40 w-full" rounded="2xl" />
      </div>
    </div>
  );
}
