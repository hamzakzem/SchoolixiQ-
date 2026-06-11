/** Official SchoolixIQ platform logo (PNG). */
export const SCHOOLIXIQ_LOGO_SRC = '/brand/schoolixiq-logo.png';

/** Legacy SVG favicon path — kept for backward compatibility checks only. */
export const LEGACY_PLATFORM_LOGO_SRC = '/icon.svg';

const DEFAULT_PLATFORM_LOGO_PATHS = new Set<string>([
  SCHOOLIXIQ_LOGO_SRC,
  LEGACY_PLATFORM_LOGO_SRC,
]);

/** True when the URL is a Super Admin / system override (not the default platform asset). */
export function isCustomAppLogo(logo?: string | null): boolean {
  if (!logo) return false;
  return !DEFAULT_PLATFORM_LOGO_PATHS.has(logo);
}

/** True when a school uploaded its own logo (not the default platform asset). */
export function isCustomSchoolLogo(logo?: string | null): boolean {
  if (!logo) return false;
  return !DEFAULT_PLATFORM_LOGO_PATHS.has(logo);
}

export function resolveAppLogoSrc(logo?: string | null): string {
  return isCustomAppLogo(logo) ? logo! : SCHOOLIXIQ_LOGO_SRC;
}
