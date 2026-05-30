// Helper to determine the backend API server URL dynamically
export function getApiUrl(path: string): string {
  // Let's first check if we have a saved API URL in localStorage (which gets updated in real-time from the Firestore config)
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

  // Check if we are in a mobile container (Capacitor) or standalone local build
  const isMobileContainer = 
    typeof window !== 'undefined' && (
      window.location.href.startsWith('capacitor:') || 
      window.location.href.startsWith('http://localhost') || 
      window.location.href.startsWith('file:') ||
      navigator.userAgent.includes('Capacitor') ||
      (window as any).Capacitor !== undefined
    );

  if (isMobileContainer && appUrl) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${appUrl}${cleanPath}`;
  }

  // If on the web, relative URL paths work natively
  return path;
}
