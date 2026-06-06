import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';
import { AppError } from '../AppError';
import { classifyAuthError } from './errors';
import { isInAppWebView, isInIframe, isNativeApp } from './environment';
import {
  provisionUserProfile,
  type ProvisionProfileInput,
} from './profileProvisioning';

const WEB_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ||
  '377979165565-2k1qjeet2clrjob0eahb6kb5ejcvdp99.apps.googleusercontent.com';

export type GoogleSignInOptions = {
  /** Skip in-app browser guard (user explicitly chose to retry). */
  bypassWebViewCheck?: boolean;
};

export type GoogleSignInResult = {
  user: User;
};

function buildGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  return provider;
}

function isBenignPopupDismissal(error: unknown): boolean {
  const kind = classifyAuthError(error);
  return kind === 'cancelled' || kind === 'popup-blocked';
}

/** Firebase Auth v9 — popup on web, native plugin + credential on Capacitor. */
export async function signInWithGoogle(
  options: GoogleSignInOptions = {},
): Promise<GoogleSignInResult> {
  if (!options.bypassWebViewCheck && isInAppWebView() && !isNativeApp()) {
    throw new AppError(
      'Google sign-in requires Chrome or Safari',
      { code: 'auth/in-app-browser', source: 'auth' },
    );
  }

  if (isInIframe() && !isNativeApp()) {
    throw new AppError(
      'Google sign-in requires a full browser window',
      { code: 'auth/iframe-blocked', source: 'auth' },
    );
  }

  if (isNativeApp()) {
    return signInWithGoogleNative();
  }

  return signInWithGooglePopup();
}

async function signInWithGooglePopup(): Promise<GoogleSignInResult> {
  try {
    const result = await signInWithPopup(auth, buildGoogleProvider());
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

async function signInWithGoogleNative(): Promise<GoogleSignInResult> {
  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');

  try {
    await GoogleAuth.initialize({
      clientId: WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
  } catch {
    /* already initialized */
  }

  const googleUser = await GoogleAuth.signIn();
  const idToken = googleUser?.authentication?.idToken;

  if (!idToken) {
    throw new AppError('Missing ID token from native Google Auth', {
      code: 'auth/missing-id-token',
      source: 'auth',
    });
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);

  if (!result.user) {
    throw new AppError('Google sign-in returned no user', {
      code: 'auth/no-user',
      source: 'auth',
    });
  }

  return { user: result.user };
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
