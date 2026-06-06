import { GoogleAuthProvider, signInWithCredential, type User } from 'firebase/auth';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth } from '../firebase';
import { AppError } from '../AppError';

const WEB_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ||
  '377979165565-2k1qjeet2clrjob0eahb6kb5ejcvdp99.apps.googleusercontent.com';

export type GoogleSignInResult = {
  user: User;
};

type GoogleAuthPlugin = {
  initialize(options: {
    clientId: string;
    scopes?: string[];
    grantOfflineAccess?: boolean;
  }): Promise<void>;
  signIn(): Promise<{
    authentication?: { idToken?: string };
  }>;
};

/** Bridge to native Capacitor plugin — no npm web fallback (no gapi/platform.js). */
const GoogleAuth = registerPlugin<GoogleAuthPlugin>('GoogleAuth');

/** Capacitor Android/iOS only — never call when platform is web. */
export async function signInWithGoogleNative(): Promise<GoogleSignInResult> {
  if (Capacitor.getPlatform() === 'web') {
    throw new AppError('Native Google sign-in is not available on web', {
      code: 'auth/web-platform',
      source: 'auth',
    });
  }

  try {
    await GoogleAuth.initialize({
      clientId: WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: false,
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
