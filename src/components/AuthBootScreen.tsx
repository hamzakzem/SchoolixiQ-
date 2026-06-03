import React from 'react';
import { GraduationCap } from 'lucide-react';

/** Lightweight splash while auth session resolves (faster than full SolarLoading). */
export default function AuthBootScreen() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-50 dark:bg-slate-950 gap-6"
      role="status"
      aria-live="polite"
      aria-label="جاري التحميل"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#0B2345] text-[#D4A64A] flex items-center justify-center shadow-lg">
        <GraduationCap size={32} strokeWidth={2} />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-[3px] border-slate-200 border-t-[#0B2345] dark:border-slate-700 dark:border-t-[#D4A64A] rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">جاري تحميل المنصة...</p>
      </div>
    </div>
  );
}
