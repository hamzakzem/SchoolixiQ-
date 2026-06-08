const AI_STUDIO_BACKEND_PATTERN = /ais-(pre|dev)|europe-west2\.run\.app/i;
const BACKEND_STORAGE_KEY = 'schoolix_api_backend_url';

export const BACKEND_NOT_CONFIGURED_MESSAGE =
  'رابط الخادم الخلفي غير مضبوط في إعدادات النظام';

let runtimeBackendBaseUrl = '';

function isCapacitorNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.href.startsWith('capacitor:') ||
    window.location.href.startsWith('file:') ||
    navigator.userAgent.includes('Capacitor') ||
    (window as { Capacitor?: unknown }).Capacitor !== undefined
  );
}

function isProductionWebHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'schoolixiq.com' || host.endsWith('.schoolixiq.com');
}

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.includes('-dev-')
  );
}

export function isAiStudioBackendUrl(url: string): boolean {
  return AI_STUDIO_BACKEND_PATTERN.test(url);
}

export function isSchoolixFrontendHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'schoolixiq.com' || host.endsWith('.schoolixiq.com');
  } catch {
    return false;
  }
}

function isSameOriginAsFrontend(url: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

function normalizeBaseUrl(url: string): string {
  let clean = String(url || '').trim().replace(/\/$/, '');
  if (
    clean &&
    !clean.startsWith('http://localhost') &&
    !clean.startsWith('http://127.0.0.1')
  ) {
    clean = clean.replace(/^http:\/\//i, 'https://');
  }
  return clean;
}

/** True when URL must not be used as the Node/Cloud Run admin API base. */
export function isValidBackendBaseUrl(url: string): boolean {
  const clean = normalizeBaseUrl(url);
  if (!clean) return false;
  if (isAiStudioBackendUrl(clean)) return false;
  if (isSchoolixFrontendHost(clean)) return false;
  if (isProductionWebHost() && isSameOriginAsFrontend(clean)) return false;
  try {
    const parsed = new URL(clean);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function readStoredBackendUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    const saved = localStorage.getItem(BACKEND_STORAGE_KEY) || '';
    const clean = normalizeBaseUrl(saved);
    if (!isValidBackendBaseUrl(clean)) {
      if (saved) localStorage.removeItem(BACKEND_STORAGE_KEY);
      return '';
    }
    return clean;
  } catch {
    return '';
  }
}

if (typeof window !== 'undefined') {
  const stored = readStoredBackendUrl();
  if (stored) runtimeBackendBaseUrl = stored;
}

/** Resolve backend URL from Firestore system/config (production web). */
export function resolveBackendUrlFromSystemConfig(
  config: Record<string, unknown>,
  isDevClient: boolean,
): string {
  const candidates = isDevClient
    ? [config.appUrlDev, config.appUrl]
    : [config.appUrlProd, config.backendUrl, config.appUrl];

  for (const raw of candidates) {
    const url = typeof raw === 'string' ? raw : '';
    if (isValidBackendBaseUrl(url)) {
      return normalizeBaseUrl(url);
    }
  }
  return '';
}

/** Persist Cloud Run / Node backend base URL (not the static frontend host). */
export function setBackendApiBaseUrl(url: string): void {
  const clean = normalizeBaseUrl(url);
  if (!isValidBackendBaseUrl(clean)) return;
  runtimeBackendBaseUrl = clean;
  try {
    localStorage.setItem(BACKEND_STORAGE_KEY, clean);
  } catch {
    // ignore storage errors
  }
}

/**
 * Resolution order:
 * 1. VITE_API_BACKEND_URL
 * 2. Runtime value from Firestore (appUrlProd / backendUrl)
 * 3. localStorage cache
 */
export function getBackendApiBaseUrl(): string {
  const viteBackend = normalizeBaseUrl(
    String(import.meta.env.VITE_API_BACKEND_URL || ''),
  );
  if (isValidBackendBaseUrl(viteBackend)) {
    return viteBackend;
  }

  if (isValidBackendBaseUrl(runtimeBackendBaseUrl)) {
    return runtimeBackendBaseUrl;
  }

  const stored = readStoredBackendUrl();
  if (isValidBackendBaseUrl(stored)) {
    return stored;
  }

  return '';
}

export function logBackendResolutionStatus(
  context: string,
  endpoint?: string,
): void {
  const vite = normalizeBaseUrl(String(import.meta.env.VITE_API_BACKEND_URL || ''));
  const resolved = getBackendApiBaseUrl();
  const absolute = endpoint ? getApiUrl(endpoint) : '';
  const usesRelativeFallback = Boolean(
    endpoint && requiresRemoteBackend(endpoint) && absolute.startsWith('/'),
  );

  console.info('[API BACKEND STATUS]', {
    context,
    endpoint: endpoint || null,
    resolvedBase: resolved || null,
    resolvedAbsolute:
      absolute && !absolute.startsWith('/')
        ? absolute.split('?')[0]
        : absolute || null,
    usesRelativeFallback,
    isProductionWeb: isProductionWebBrowser(),
    viteEnvValid: isValidBackendBaseUrl(vite),
    runtimeValid: isValidBackendBaseUrl(runtimeBackendBaseUrl),
    storedValid: isValidBackendBaseUrl(readStoredBackendUrl()),
    webHost: typeof window !== 'undefined' ? window.location.hostname : null,
  });
}

/** Remove legacy AI Studio preview URLs cached for production web browsers. */
export function purgeStaleApiUrlCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const saved = window.localStorage.getItem('schoolix_app_api_url') || '';
    if (!saved) return;
    if (
      isProductionWebHost() ||
      isAiStudioBackendUrl(saved) ||
      isSchoolixFrontendHost(saved)
    ) {
      window.localStorage.removeItem('schoolix_app_api_url');
    }
  } catch {
    // ignore storage errors
  }
}

if (typeof window !== 'undefined' && isProductionWebHost()) {
  purgeStaleApiUrlCache();
}

/** Paths that require Firebase Admin / Node backend (never static Hostinger HTML). */
export function requiresRemoteBackend(path: string): boolean {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return (
    cleanPath.startsWith('/api/admin/') ||
    cleanPath.startsWith('/api/upload')
  );
}

export function isProductionWebBrowser(): boolean {
  return typeof window !== 'undefined' && isProductionWebHost() && !isCapacitorNativeApp();
}

// Helper to determine the backend API server URL dynamically
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const needsRemote = requiresRemoteBackend(cleanPath);
  const isNative = isCapacitorNativeApp();

  if (needsRemote || isNative) {
    const backendBase = getBackendApiBaseUrl();
    if (backendBase) {
      return `${backendBase}${cleanPath}`;
    }
    // Production static Hostinger must never call same-origin /api/admin/*.
    if (isProductionWebBrowser()) {
      return cleanPath;
    }
  }

  // Local dev may proxy /api/* to a local Node server.
  if (typeof window !== 'undefined' && !isNative && isLocalDevHost()) {
    purgeStaleApiUrlCache();
    return cleanPath;
  }

  const fallbackBase = getBackendApiBaseUrl();
  if (fallbackBase) {
    return `${fallbackBase}${cleanPath}`;
  }

  return cleanPath;
}
