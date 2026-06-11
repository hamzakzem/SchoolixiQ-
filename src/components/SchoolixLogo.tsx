import React from 'react';
import { SCHOOLIXIQ_LOGO_SRC } from '../lib/brandAssets';

export { SCHOOLIXIQ_LOGO_SRC };

interface SchoolixLogoProps {
  className?: string;
  size?: number;
  withText?: boolean;
  /** Use on dark backgrounds so black logo segments stay visible. */
  surface?: 'light' | 'dark';
  src?: string;
}

export default function SchoolixLogo({
  className = '',
  size = 42,
  withText = false,
  surface = 'light',
  src = SCHOOLIXIQ_LOGO_SRC,
}: SchoolixLogoProps) {
  const logo = (
    <img
      src={src}
      alt="SchoolixIQ logo"
      width={size}
      height={size}
      className="w-full h-full object-contain select-none"
      loading="eager"
      decoding="async"
    />
  );

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`relative flex items-center justify-center shrink-0 ${
          surface === 'dark'
            ? 'rounded-xl bg-white p-1 shadow-sm ring-1 ring-white/10'
            : ''
        }`}
        style={{ width: size, height: size }}
      >
        {logo}
      </div>
      {withText && (
        <span className="font-display font-black tracking-tight text-[22px] select-none">
          <span className="text-[#0B2345] dark:text-white">Schoolix</span>
          <span className="text-[#D4A64A]">iQ</span>
        </span>
      )}
    </div>
  );
}
