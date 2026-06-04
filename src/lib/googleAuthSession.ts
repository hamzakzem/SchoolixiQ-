/** Session keys for Google OAuth redirect round-trip */
export const PENDING_GOOGLE_ROLE_KEY = 'pendingGoogleRole';
export const PENDING_GOOGLE_MODE_KEY = 'pendingGoogleMode';

function writeStorage(key: string, value: string): void {
  window.sessionStorage.setItem(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function readStorage(key: string): string | null {
  return (
    window.sessionStorage.getItem(key) ||
    (() => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    })()
  );
}

function removeStorage(key: string): void {
  window.sessionStorage.removeItem(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function persistGoogleAuthContext(role: string, mode: string): void {
  if (typeof window === 'undefined') return;
  writeStorage(PENDING_GOOGLE_ROLE_KEY, role);
  writeStorage(PENDING_GOOGLE_MODE_KEY, mode);
}

export function readGoogleAuthContext(): { role: string; mode: string } {
  if (typeof window === 'undefined') {
    return { role: 'parent', mode: 'login' };
  }
  return {
    role: readStorage(PENDING_GOOGLE_ROLE_KEY) || 'parent',
    mode: readStorage(PENDING_GOOGLE_MODE_KEY) || 'login',
  };
}

export function clearGoogleAuthContext(): void {
  if (typeof window === 'undefined') return;
  removeStorage(PENDING_GOOGLE_ROLE_KEY);
  removeStorage(PENDING_GOOGLE_MODE_KEY);
}

export type GoogleUrlOAuthError = {
  code: string;
  message: string;
};

/** Errors Google/Firebase append to the return URL after a failed redirect */
export function parseGoogleOAuthUrlError(): GoogleUrlOAuthError | null {
  if (typeof window === 'undefined') return null;

  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(
    window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash,
  );

  const error =
    search.get('error') ||
    hash.get('error') ||
    (search.get('errorCode') ?? hash.get('errorCode'));
  const description =
    search.get('error_description') ||
    hash.get('error_description') ||
    search.get('message') ||
    hash.get('message') ||
    '';

  const haystack = `${window.location.search}${window.location.hash}`.toLowerCase();
  if (haystack.includes('disallowed_useragent')) {
    return {
      code: 'disallowed_useragent',
      message: description || 'disallowed_useragent',
    };
  }

  if (!error && !description) return null;

  return {
    code: error || 'oauth_error',
    message: description || error || 'oauth_error',
  };
}

export function cleanGoogleOAuthParamsFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const strip = [
    'error',
    'error_description',
    'errorCode',
    'message',
    'state',
    'code',
    'scope',
    'authuser',
    'prompt',
    'hd',
  ];
  for (const key of strip) {
    url.searchParams.delete(key);
  }
  if (url.hash) {
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    let changed = false;
    for (const key of strip) {
      if (hashParams.has(key)) {
        hashParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const rest = hashParams.toString();
      url.hash = rest ? `#${rest}` : '';
    }
  }
  window.history.replaceState(window.history.state, '', url.toString());
}
