import React from 'react';
import SchoolixLogo from '../SchoolixLogo';

type Props = {
  size?: number;
  className?: string;
  withText?: boolean;
  appName?: string;
};

/** Circular brand mark with animated gold ring — landing only */
export function LandingCircularLogo({
  size = 40,
  className = '',
  withText = false,
  appName = 'SchoolixIQ',
}: Props) {
  const inner = Math.max(20, size - 10);

  return (
    <div className={`lp-circular-logo ${className}`} style={{ width: size, height: size }}>
      <span className="lp-circular-logo__ring" aria-hidden="true" />
      <span className="lp-circular-logo__ring lp-circular-logo__ring--reverse" aria-hidden="true" />
      <div className="lp-circular-logo__core">
        <SchoolixLogo size={inner} surface="dark" />
      </div>
      {withText && (
        <span className="sr-only">{appName}</span>
      )}
    </div>
  );
}

export function LandingCircularLogoWithLabel({
  size = 44,
  appName = 'SchoolixIQ',
  className = '',
}: Props) {
  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      <LandingCircularLogo size={size} appName={appName} />
      <span className="font-black text-[0.9375rem] tracking-tight text-white truncate">{appName}</span>
    </div>
  );
}
