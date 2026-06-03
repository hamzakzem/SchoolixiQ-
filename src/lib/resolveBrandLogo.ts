import {
  BRAND_ASSET_VERSION,
  BRAND_ICON_192,
  BRAND_ICON_512,
  BRAND_LOGO_PATH,
} from './brandAssets';

const LEGACY_LOGO_HINTS = [
  '/favicon.png',
  'favicon.png',
  '/icon.svg',
  'icon.svg',
  'unsplash.com',
  'twemoji',
];

/** Cache-busted URL for static files in /public */
export function brandAssetUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const sep = normalized.includes('?') ? '&' : '?';
  return `${normalized}${sep}v=${BRAND_ASSET_VERSION}`;
}

export const BRAND_LOGO_URL = brandAssetUrl(BRAND_LOGO_PATH);
export const BRAND_ICON_192_URL = brandAssetUrl(BRAND_ICON_192);
export const BRAND_ICON_512_URL = brandAssetUrl(BRAND_ICON_512);

function isLegacyLogo(value: string): boolean {
  const lower = value.toLowerCase();
  return LEGACY_LOGO_HINTS.some((hint) => lower.includes(hint));
}

/**
 * Platform logo for UI: prefer bundled /public/logo.png so mobile/PWA always get the new mark.
 * Remote URLs are kept; old base64 uploads from Firestore are replaced by the shipped asset.
 */
export function resolveAppLogo(stored?: string | null): string {
  const value = stored?.trim() || '';
  if (!value) return BRAND_LOGO_URL;
  if (isLegacyLogo(value)) return BRAND_LOGO_URL;
  if (value.startsWith('/logo.png') || value === BRAND_LOGO_PATH) return BRAND_LOGO_URL;
  if (value.startsWith('data:image/')) return BRAND_LOGO_URL;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return brandAssetUrl(value);
  return value;
}

const CACHE_CONFIG_KEY = 'schoolixiq_system_config';
const CACHE_BRAND_VERSION_KEY = 'schoolixiq_brand_asset_version';

/** Clear stale system config logo cached on phones after a brand refresh */
export function migrateBrandLogoCache(): void {
  if (typeof window === 'undefined') return;
  const version = BRAND_ASSET_VERSION;
  if (localStorage.getItem(CACHE_BRAND_VERSION_KEY) === version) return;

  try {
    const raw = localStorage.getItem(CACHE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { appLogo?: string };
      if (parsed && typeof parsed === 'object') {
        parsed.appLogo = resolveAppLogo(parsed.appLogo);
        localStorage.setItem(CACHE_CONFIG_KEY, JSON.stringify(parsed));
      }
    }
    localStorage.setItem(CACHE_BRAND_VERSION_KEY, version);
  } catch (e) {
    console.warn('Brand logo cache migration skipped:', e);
  }
}
