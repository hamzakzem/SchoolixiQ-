const AI_STUDIO_BACKEND_PATTERN = /ais-(pre|dev)|europe-west2\.run\.app/i;

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

/** Remove stale AI Studio preview URLs cached for production web browsers. */
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

// Clear polluted cache as early as possible on production web.
if (typeof window !== 'undefined' && isProductionWebHost()) {
  purgeStaleApiUrlCache();
}

// Helper to determine the backend API server URL dynamically
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // All browser web clients use same-origin API routes (no cross-origin CORS).
  if (typeof window !== 'undefined' && !isCapacitorNativeApp()) {
    purgeStaleApiUrlCache();
    return cleanPath;
  }

  // Native/Capacitor apps may target an external backend.
  let savedUrl = '';
  if (typeof window !== 'undefined') {
    try {
      savedUrl = window.localStorage.getItem('schoolix_app_api_url') || '';
    } catch {
      savedUrl = '';
    }
  }

  const isDevClient = isLocalDevHost();
  let targetUrl = '';

  if (savedUrl) {
    const isDevSavedUrl =
      savedUrl.includes('-dev-') ||
      savedUrl.includes('localhost') ||
      savedUrl.includes('127.0.0.1');
    if (!isDevClient && isDevSavedUrl) {
      targetUrl = '';
    } else if (!isProductionWebHost() || !isAiStudioBackendUrl(savedUrl)) {
      targetUrl = savedUrl;
    }
  }

  if (!targetUrl) {
    targetUrl = process.env.APP_URL || '';
  }

  if (!targetUrl) {
    targetUrl = isDevClient
      ? 'https://ais-dev-zvujfimwp5qybst5dz4x6n-99877674137.europe-west2.run.app'
      : 'https://ais-pre-zvujfimwp5qybst5dz4x6n-99877674137.europe-west2.run.app';
  }

  let cleanSavedUrl = targetUrl.replace(/\/$/, '');

  if (
    cleanSavedUrl &&
    !cleanSavedUrl.startsWith('http://localhost') &&
    !cleanSavedUrl.startsWith('http://127.0.0.1')
  ) {
    cleanSavedUrl = cleanSavedUrl.replace(/^http:\/\//i, 'https://');
  }

  return `${cleanSavedUrl}${cleanPath}`;
}
