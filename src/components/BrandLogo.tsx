import React from 'react';
import { useSystemConfig } from '../lib/SystemConfigContext';
import { BRAND_LOGO_URL, resolveAppLogo } from '../lib/resolveBrandLogo';

type Props = {
  className?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'splash';
};

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
  sm: 'max-h-10 w-auto',
  md: 'max-h-16 sm:max-h-20 w-auto',
  lg: 'max-h-20 sm:max-h-24 w-auto',
  splash: 'max-h-24 sm:max-h-32 w-auto',
};

export const BrandLogo: React.FC<Props> = ({
  className = '',
  alt = 'SchoolixiQ',
  size = 'md',
}) => {
  const { config } = useSystemConfig();
  const src = resolveAppLogo(config.appLogo) || BRAND_LOGO_URL;

  return (
    <img
      src={src}
      alt={alt}
      className={`object-contain drop-shadow-sm ${sizeClasses[size]} ${className}`}
      loading="eager"
      decoding="async"
    />
  );
};

export default BrandLogo;
