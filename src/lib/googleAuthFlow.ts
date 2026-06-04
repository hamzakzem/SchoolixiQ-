import { Capacitor } from '@capacitor/core';
import {
  GoogleAuthProvider,
  signInWithCredential,
  type Auth,
  type User,
} from 'firebase/auth';
import { signInWithGoogleRedirectWeb, signInWithGoogleWeb } from './googleAuthWeb';

export function getGoogleWebClientId(): string {
  if (typeof localStorage !== 'undefined') {
    const override = localStorage.getItem('override_google_client_id')?.trim();
    if (override) return override;
  }
  const fromEnv = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  return '377979165565-2k1qjeet2clrjob0eahb6kb5ejcvdp99.apps.googleusercontent.com';
}

export function isCapacitorNative(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

/** Mobile browsers and iframes cannot reliably use signInWithPopup. */
export function shouldPreferGoogleRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  if (isCapacitorNative()) return false;
  if (window.self !== window.top) return true;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || '',
  );
}

export type GoogleSignInFlowResult =
  | { status: 'success'; user: User }
  | { status: 'cancelled' }
  | { status: 'popup-blocked' }
  | { status: 'redirecting' }
  | { status: 'error'; error: Error };

async function signInWithGoogleNative(auth: Auth, clientId: string): Promise<User> {
  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
  try {
    await GoogleAuth.initialize({
      clientId,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
  } catch (initErr) {
    console.warn('GoogleAuth.initialize:', initErr);
  }

  const googleUser = await GoogleAuth.signIn();
  const idToken = googleUser?.authentication?.idToken;
  if (!idToken) {
    throw new Error('Missing Google ID token from native sign-in');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  if (!result.user) {
    throw new Error('Firebase sign-in with Google credential failed');
  }
  return result.user;
}

/**
 * Unified Google sign-in: native plugin on app, redirect on mobile web / iframe, popup on desktop.
 */
export async function runGoogleSignInFlow(
  auth: Auth,
  isRtl: boolean,
): Promise<GoogleSignInFlowResult> {
  auth.languageCode = isRtl ? 'ar' : 'en';
  const clientId = getGoogleWebClientId();

  if (isCapacitorNative()) {
    try {
      const user = await signInWithGoogleNative(auth, clientId);
      return { status: 'success', user };
    } catch (nativeErr) {
      console.warn('Native Google sign-in failed, using redirect fallback', nativeErr);
      try {
        await signInWithGoogleRedirectWeb(auth);
        return { status: 'redirecting' };
      } catch (redirectErr) {
        return {
          status: 'error',
          error:
            redirectErr instanceof Error
              ? redirectErr
              : new Error(String(redirectErr)),
        };
      }
    }
  }

  if (shouldPreferGoogleRedirect()) {
    await signInWithGoogleRedirectWeb(auth);
    return { status: 'redirecting' };
  }

  const webResult = await signInWithGoogleWeb(auth);
  if (webResult.ok) {
    return { status: 'success', user: webResult.user };
  }
  if (webResult.cancelled) {
    return { status: 'cancelled' };
  }
  if (webResult.popupBlocked) {
    try {
      await signInWithGoogleRedirectWeb(auth);
      return { status: 'redirecting' };
    } catch (redirectErr) {
      return {
        status: 'error',
        error:
          redirectErr instanceof Error
            ? redirectErr
            : new Error(String(redirectErr)),
      };
    }
  }

  return { status: 'error', error: webResult.error };
}
