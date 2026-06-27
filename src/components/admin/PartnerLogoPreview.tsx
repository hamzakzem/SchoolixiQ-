import React, { useState } from 'react';
import { isHttpLogoUrl } from '../../lib/footerPartners';

type PartnerLogoPreviewProps = {
  logoUrl?: string;
  name?: string;
  className?: string;
};

/** Super Admin footer settings — preview with initials fallback. */
export function PartnerLogoPreview({
  logoUrl,
  name,
  className = 'w-12 h-12',
}: PartnerLogoPreviewProps) {
  const [failed, setFailed] = useState(false);
  const showImage = isHttpLogoUrl(logoUrl) && !failed;
  const initial = (name || 'ش').trim().charAt(0) || 'ش';

  return (
    <div
      className={`${className} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 p-1 overflow-hidden`}
    >
      {showImage ? (
        <img
          src={logoUrl}
          alt={name || 'معاينة الشعار'}
          className={`max-w-full max-h-full object-contain ${className.includes('rounded-full') ? 'rounded-full object-cover w-full h-full' : ''}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-sm font-black text-slate-500 dark:text-slate-300" aria-hidden="true">
          {initial}
        </span>
      )}
    </div>
  );
}
