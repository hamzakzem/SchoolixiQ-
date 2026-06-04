// Helper to determine the backend API server URL dynamically
export function getApiUrl(path: string): string {
  // Check if we are in a mobile container (Capacitor) or standalone local build
  const isMobileContainer = 
    typeof window !== 'undefined' && (
      window.location.href.startsWith('capacitor:') || 
      window.location.href.startsWith('http://localhost') || 
      window.location.href.startsWith('file:') ||
      navigator.userAgent.includes('Capacitor') ||
      (window as any).Capacitor !== undefined
    );

  // Only for mobile apps, look for dynamic API URL stored in localStorage
  let savedUrl = '';
  if (typeof window !== 'undefined') {
    try {
      savedUrl = window.localStorage.getItem('schoolix_app_api_url') || '';
    } catch (_) {}
  }

  const isDevClient = typeof window !== 'undefined' && (
    window.location.hostname.includes('-dev-') || 
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('127.0.0.1')
  );

  let targetUrl = '';

  if (savedUrl) {
    const isDevSavedUrl = savedUrl.includes('-dev-') || savedUrl.includes('localhost') || savedUrl.includes('127.0.0.1');
    // Security/Stability Guard: If we are a production build but saved URL is dev, ignore it
    if (!isDevClient && isDevSavedUrl) {
      targetUrl = '';
    } else {
      targetUrl = savedUrl;
    }
  }

  // Fallback 1: process.env.APP_URL defined by Vite configuration during build
  if (!targetUrl) {
    targetUrl = process.env.APP_URL || '';
  }

  // Fallback 2: Direct hardcoded backup URLs for total stability of native apps
  if (!targetUrl) {
    targetUrl = isDevClient
      ? 'https://ais-dev-zvujfimwp5qybst5dz4x6n-99877674137.europe-west2.run.app'
      : 'https://schoolixiq-backend-377979165565.europe-west2.run.app';
  }

  // Clean trailing slashes
  let cleanSavedUrl = targetUrl.replace(/\/$/, '');

  // CRITICAL: Force upgrade HTTP to HTTPS for external domains to prevent POST method downgrades from redirects
  if (cleanSavedUrl && !cleanSavedUrl.startsWith('http://localhost') && !cleanSavedUrl.startsWith('http://127.0.0.1')) {
    cleanSavedUrl = cleanSavedUrl.replace(/^http:\/\//i, 'https://');
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Static Hostinger frontend has no /api proxy — always hit Cloud Run for API routes
  if (typeof window !== 'undefined' && path.startsWith('/api/')) {
    const host = window.location.hostname.toLowerCase();
    const isProductionSite =
      host.includes('schoolixiq.com') || host.includes('schoolixiq.iq');
    if (isProductionSite) {
      let apiBase = cleanSavedUrl;
      if (!apiBase.includes('run.app')) {
        apiBase = isDevClient
          ? 'https://ais-dev-zvujfimwp5qybst5dz4x6n-99877674137.europe-west2.run.app'
          : 'https://schoolixiq-backend-377979165565.europe-west2.run.app';
      }
      return `${apiBase.replace(/\/$/, '')}${cleanPath}`;
    }
  }

  // Web: different origin → absolute URL; same origin → relative (local dev with API proxy)
  if (typeof window !== 'undefined' && !isMobileContainer) {
    const currentOrigin = window.location.origin.replace(/\/$/, '').toLowerCase();
    const backendOrigin = cleanSavedUrl.toLowerCase();
    if (currentOrigin !== backendOrigin && cleanSavedUrl) {
      return `${cleanSavedUrl}${cleanPath}`;
    }
    return cleanPath;
  }

  return `${cleanSavedUrl}${cleanPath}`;
}
