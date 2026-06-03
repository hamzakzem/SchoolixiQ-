import React from 'react';
import BrandLogo from './BrandLogo';
import { BRAND_THEME_COLOR, BRAND_ACCENT_COLOR } from '../lib/brandAssets';

/** Welcome / boot screen while auth session resolves. */
export default function AuthBootScreen() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[100dvh] bg-white dark:bg-slate-950 gap-8 px-6"
      role="status"
      aria-live="polite"
      aria-label="جاري التحميل"
    >
      <div className="relative flex flex-col items-center gap-6">
        <div
          className="absolute -inset-8 rounded-full blur-3xl opacity-20"
          style={{
            background: `linear-gradient(135deg, ${BRAND_THEME_COLOR} 0%, ${BRAND_ACCENT_COLOR} 100%)`,
          }}
        />
        <BrandLogo size="splash" className="relative z-10" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 border-[3px] border-slate-200 border-t-[#0B2345] dark:border-slate-700 dark:border-t-[#D4A64A] rounded-full animate-spin"
          style={{ borderTopColor: BRAND_ACCENT_COLOR }}
        />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
          جاري تحميل المنصة...
        </p>
      </div>
    </div>
  );
}
