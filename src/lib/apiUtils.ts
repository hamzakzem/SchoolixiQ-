const AI_STUDIO_BACKEND_PATTERN = /ais-(pre|dev)|europe-west2\.run\.app/i;
const BACKEND_STORAGE_KEY = 'schoolix_api_backend_url';

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

function readStoredBackendUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    const saved = localStorage.getItem(BACKEND_STORAGE_KEY) || '';
    const clean = normalizeBaseUrl(saved);
    if (!clean || isAiStudioBackendUrl(clean)) return '';
    if (isProductionWebHost() && isSameOriginAsFrontend(clean)) return '';
    return clean;
  } catch {
    return '';
  }
}

if (typeof window !== 'undefined') {
  const stored = readStoredBackendUrl();
  if (stored) runtimeBackendBaseUrl = stored;
}

/** Persist Cloud Run / Node backend base URL (not the static frontend host). */
export function setBackendApiBaseUrl(url: string): void {
  const clean = normalizeBaseUrl(url);
  if (!clean || isAiStudioBackendUrl(clean)) return;
  if (isProductionWebHost() && isSameOriginAsFrontend(clean)) return;
  runtimeBackendBaseUrl = clean;
  try {
    localStorage.setItem(BACKEND_STORAGE_KEY, clean);
  } catch {
    // ignore storage errors
  }
}

export function getBackendApiBaseUrl(): string {
  if (runtimeBackendBaseUrl) return runtimeBackendBaseUrl;

  const viteBackend = normalizeBaseUrl(
    String(import.meta.env.VITE_API_BACKEND_URL || ''),
  );
  if (
    viteBackend &&
    !isAiStudioBackendUrl(viteBackend) &&
    !(isProductionWebHost() && isSameOriginAsFrontend(viteBackend))
  ) {
    return viteBackend;
  }

  return readStoredBackendUrl();
}

/** Remove legacy AI Studio preview URLs cached for production web browsers. */
export function purgeStaleApiUrlCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const saved = window.localStorage.getItem('schoolix_app_api_url') || '';
    if (!saved) return;
    if (isProductionWebHost() || isAiStudioBackendUrl(saved)) {
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
  }

  // Local dev may proxy /api/* to a local Node server.
  if (typeof window !== 'undefined' && !isNative) {
    purgeStaleApiUrlCache();
    return cleanPath;
  }

  const fallbackBase = getBackendApiBaseUrl();
  if (fallbackBase) {
    return `${fallbackBase}${cleanPath}`;
  }

  return cleanPath;
}
