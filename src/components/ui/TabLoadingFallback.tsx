import React from 'react';

/** Neutral tab panel loader — navy + gold design tokens (sx-primary / sx-accent). */
export function TabLoadingFallback() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[min(50vh,420px)] w-full sx-fade-in"
      aria-busy="true"
      aria-label="Loading"
    >
      <div
        className="w-11 h-11 rounded-2xl border-[3px] border-sx-accent/30 border-t-sx-accent animate-spin"
        role="presentation"
      />
      <p className="mt-4 text-sm font-bold text-sx-primary dark:text-slate-300">جاري التحميل…</p>
    </div>
  );
}
