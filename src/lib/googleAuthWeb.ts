import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type User,
} from 'firebase/auth';
import { markGoogleRedirectPending } from './oauthReturnGuard';

export type GoogleWebSignInResult =
  | { ok: true; user: User; method: 'popup' }
  | { ok: false; cancelled: true }
  | { ok: false; popupBlocked: true }
  | { ok: false; error: Error };

/** Popup-first Google sign-in — avoids navigating the main tab to *.firebaseapp.com */
export async function signInWithGoogleWeb(auth: Auth): Promise<GoogleWebSignInResult> {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  try {
    const result = await signInWithPopup(auth, provider);
    return { ok: true, user: result.user, method: 'popup' };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    const code = error.code || '';

    if (code === 'auth/popup-closed-by-user') {
      return { ok: false, cancelled: true };
    }

    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/cancelled-popup-request'
    ) {
      return { ok: false, popupBlocked: true };
    }

    if (code === 'auth/account-exists-with-different-credential') {
      return {
        ok: false,
        error: new Error(
          'ACCOUNT_EXISTS_USE_PASSWORD',
        ),
      };
    }

    return {
      ok: false,
      error: err instanceof Error ? err : new Error(error.message || 'Google sign-in failed'),
    };
  }
}

export async function signInWithGoogleRedirectWeb(auth: Auth): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });
  markGoogleRedirectPending();
  await signInWithRedirect(auth, provider);
}
