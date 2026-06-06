import { GoogleAuthProvider, signInWithPopup, type User } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { auth } from '../firebase';
import { AppError } from '../AppError';
import { classifyAuthError } from './errors';
import { isInAppWebView, isInIframe } from './environment';
import {
  provisionUserProfile,
  type ProvisionProfileInput,
} from './profileProvisioning';

export type GoogleSignInOptions = {
  /** Skip in-app browser guard (user explicitly chose to retry). */
  bypassWebViewCheck?: boolean;
};

export type GoogleSignInResult = {
  user: User;
};

function isBenignPopupDismissal(error: unknown): boolean {
  const kind = classifyAuthError(error);
  return kind === 'cancelled' || kind === 'popup-blocked';
}

/**
 * Web: Firebase Auth v9 popup only.
 * Native Capacitor: delegated to googleSignIn.native.ts (never on web platform).
 */
export async function signInWithGoogle(
  options: GoogleSignInOptions = {},
): Promise<GoogleSignInResult> {
  if (Capacitor.getPlatform() !== 'web') {
    const { signInWithGoogleNative } = await import('./googleSignIn.native');
    return signInWithGoogleNative();
  }

  if (!options.bypassWebViewCheck && isInAppWebView()) {
    throw new AppError(
      'Google sign-in requires Chrome or Safari',
      { code: 'auth/in-app-browser', source: 'auth' },
    );
  }

  if (isInIframe()) {
    throw new AppError(
      'Google sign-in requires a full browser window',
      { code: 'auth/iframe-blocked', source: 'auth' },
    );
  }

  return signInWithGoogleWebPopup();
}

async function signInWithGoogleWebPopup(): Promise<GoogleSignInResult> {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');

  try {
    const result = await signInWithPopup(auth, provider);
    if (!result.user) {
      throw new AppError('Google sign-in returned no user', {
        code: 'auth/no-user',
        source: 'auth',
      });
    }
    return { user: result.user };
  } catch (error) {
    if (isBenignPopupDismissal(error)) {
      throw new AppError('Google sign-in popup was blocked or closed', {
        code: 'auth/popup-blocked',
        source: 'auth',
        cause: error,
      });
    }
    throw AppError.fromFirebase(error);
  }
}

/** Firebase Auth + Firestore profile provisioning (single production entry point). */
export async function authenticateWithGoogle(
  signInOptions: GoogleSignInOptions,
  profileInput: Omit<ProvisionProfileInput, 'user'>,
): Promise<{ user: User; profileCreated: boolean }> {
  const { user } = await signInWithGoogle(signInOptions);
  const { created } = await provisionUserProfile({ ...profileInput, user });
  return { user, profileCreated: created };
}
