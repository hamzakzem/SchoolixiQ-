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

  // If on the web browser, relative URL paths always work natively and avoid CORS blocks or stale domains
  if (!isMobileContainer) {
    return path;
    // Always call original path relative to current domain
  }

  // Only for mobile apps, look for dynamic API URL stored in localStorage
  let savedUrl = '';
  if (typeof window !== 'undefined') {
    try {
      savedUrl = window.localStorage.getItem('schoolix_app_api_url') || '';
    } catch (_) {}
  }

  if (savedUrl) {
    const cleanSavedUrl = savedUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanSavedUrl}${cleanPath}`;
  }

  // Fallback to process.env.APP_URL defined by Vite configuration
  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');

  if (appUrl) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${appUrl}${cleanPath}`;
  }

  // If fallback fails, return path
  return path;
}
