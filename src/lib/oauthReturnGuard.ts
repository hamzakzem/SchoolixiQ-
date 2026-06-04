/** Set when signInWithRedirect starts — cleared after bootstrap finishes */
export const GOOGLE_REDIRECT_PENDING_KEY = 'google_redirect_pending';

export function markGoogleRedirectPending(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1');
    localStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1');
  } catch {
    /* private mode */
  }
}

export function clearGoogleRedirectPending(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
    localStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function isGoogleRedirectPending(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === '1' ||
      localStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === '1'
    );
  } catch {
    return false;
  }
}

/** True on the page load immediately after Google / Firebase OAuth redirect */
export function isFirebaseOAuthReturnUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const haystack = `${window.location.search}${window.location.hash}`;
  return /[?&#](state|code|apiKey|authType|providerId)=/i.test(haystack);
}

export function isOAuthSensitiveNavigation(): boolean {
  return isFirebaseOAuthReturnUrl() || isGoogleRedirectPending();
}
