import firebaseConfig from '../../firebase-applet-config.json';

/** Reject AI Studio preview hosts only — not production Cloud Run (*.run.app). */
const AI_STUDIO_BACKEND_PATTERN = /ais-(pre|dev)|99877674137\.europe-west2\.run\.app/i;
const BACKEND_STORAGE_KEY = 'schoolix_api_backend_url';

export const BACKEND_NOT_CONFIGURED_MESSAGE =
  'رابط الخادم الخلفي غير مضبوط في إعدادات النظام';

let runtimeBackendBaseUrl = '';
let configFetchPromise: Promise<string> | null = null;

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

export function getFirestoreDatabaseId(): string {
  return firebaseConfig.firestoreDatabaseId || '(default)';
}

export function getFirebaseProjectId(): string {
  return firebaseConfig.projectId || '';
}

type ConfigResolveResult = {
  url: string;
  field: string;
  exists: boolean;
};

export type BackendConfigResolveResult = ConfigResolveResult;

/** Resolve backend URL + source field from Firestore system/config. */
export function resolveBackendConfigFromSystemConfig(
  config: Record<string, unknown>,
  isDevClient: boolean,
): ConfigResolveResult {
  return pickBackendFromConfig(config, isDevClient);
}

/** Resolve backend URL from Firestore system/config document fields. */
export function resolveBackendUrlFromSystemConfig(
  config: Record<string, unknown>,
  isDevClient: boolean,
): string {
  return pickBackendFromConfig(config, isDevClient).url;
}

function pickBackendFromConfig(
  config: Record<string, unknown>,
  isDevClient: boolean,
): ConfigResolveResult {
  const fields = isDevClient
    ? (['appUrlDev', 'appUrl'] as const)
    : (['appUrlProd', 'backendUrl', 'appUrl'] as const);

  for (const field of fields) {
    const raw = config[field];
    const url = typeof raw === 'string' ? raw : '';
    if (isValidBackendBaseUrl(url)) {
      return { url: normalizeBaseUrl(url), field, exists: true };
    }
  }
  return { url: '', field: '', exists: true };
}

async function fetchBackendFromFirestore(): Promise<ConfigResolveResult> {
  const { db } = await import('./firebase');
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'system', 'config'));
  if (!snap.exists()) {
    return { url: '', field: '', exists: false };
  }
  const isDevClient = isLocalDevHost();
  return pickBackendFromConfig(snap.data() as Record<string, unknown>, isDevClient);
}

export function logFirestoreBackendDebug(
  source: string,
  result: ConfigResolveResult,
): void {
  console.info('[API BACKEND STATUS] firestore-config', {
    source,
    projectId: getFirebaseProjectId(),
    databaseId: getFirestoreDatabaseId(),
    configExists: result.exists,
    fieldUsed: result.field || null,
    resolvedBase: result.url || null,
  });
}

function logBackendSource(source: string, url: string): void {
  console.info('[API BACKEND STATUS] resolved', {
    source,
    projectId: getFirebaseProjectId(),
    databaseId: getFirestoreDatabaseId(),
    resolvedBase: url,
  });
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

/** Synchronous read of already-resolved backend (may be empty before lazy fetch). */
export function getBackendApiBaseUrl(): string {
  if (isValidBackendBaseUrl(runtimeBackendBaseUrl)) {
    return runtimeBackendBaseUrl;
  }

  const stored = readStoredBackendUrl();
  if (isValidBackendBaseUrl(stored)) {
    return stored;
  }

  const viteBackend = normalizeBaseUrl(
    String(import.meta.env.VITE_API_BACKEND_URL || ''),
  );
  if (isValidBackendBaseUrl(viteBackend)) {
    return viteBackend;
  }

  return '';
}

/**
 * Lazy resolution before admin API calls:
 * 1. runtime cache
 * 2. localStorage
 * 3. Firestore system/config (active database)
 * 4. VITE_API_BACKEND_URL
 */
export async function ensureBackendApiBaseUrl(): Promise<string> {
  if (isValidBackendBaseUrl(runtimeBackendBaseUrl)) {
    logBackendSource('runtime-cache', runtimeBackendBaseUrl);
    return runtimeBackendBaseUrl;
  }

  const stored = readStoredBackendUrl();
  if (isValidBackendBaseUrl(stored)) {
    runtimeBackendBaseUrl = stored;
    logBackendSource('localStorage', stored);
    return stored;
  }

  if (!configFetchPromise) {
    configFetchPromise = (async () => {
      try {
        const result = await fetchBackendFromFirestore();
        logFirestoreBackendDebug('ensureBackendApiBaseUrl', result);
        if (result.url) {
          setBackendApiBaseUrl(result.url);
          return result.url;
        }
        return '';
      } catch (error) {
        console.warn('[API BACKEND STATUS] Firestore config fetch failed:', error);
        return '';
      } finally {
        configFetchPromise = null;
      }
    })();
  }

  const fromFirestore = await configFetchPromise;
  if (fromFirestore) {
    return fromFirestore;
  }

  const viteBackend = normalizeBaseUrl(
    String(import.meta.env.VITE_API_BACKEND_URL || ''),
  );
  if (isValidBackendBaseUrl(viteBackend)) {
    setBackendApiBaseUrl(viteBackend);
    logBackendSource('vite-env', viteBackend);
    return viteBackend;
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
    projectId: getFirebaseProjectId(),
    databaseId: getFirestoreDatabaseId(),
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

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const needsRemote = requiresRemoteBackend(cleanPath);
  const isNative = isCapacitorNativeApp();

  if (needsRemote || isNative) {
    const backendBase = getBackendApiBaseUrl();
    if (backendBase) {
      return `${backendBase}${cleanPath}`;
    }
    if (isProductionWebBrowser()) {
      return cleanPath;
    }
  }

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
