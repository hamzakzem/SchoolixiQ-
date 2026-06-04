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

/**
 * Google blocks OAuth in embedded WebViews (403 disallowed_useragent).
 * Capacitor app WebView counts — must use native GoogleAuth plugin only.
 */
export function isInsecureOAuthWebView(): boolean {
  if (typeof window === 'undefined') return false;
  if (isCapacitorNative()) return true;

  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua) && /; wv\)|\bwv\b/i.test(ua)) return true;
  if (
    /iPhone|iPad|iPod/i.test(ua) &&
    /AppleWebKit/i.test(ua) &&
    !/Safari|CriOS|FxiOS/i.test(ua)
  ) {
    return true;
  }
  if (/FBAN|FBAV|Instagram|Line\//i.test(ua)) return true;
  return false;
}

export function isGoogleDisallowedUserAgentError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('disallowed_useragent') ||
    m.includes('403') ||
    m.includes('secure browsers') ||
    m.includes('متصفحات آمنة') ||
    m.includes('doesn\'t comply with google\'s policies')
  );
}

/** Read OAuth error returned in URL after a blocked redirect attempt */
export function detectGoogleOAuthUrlError(): string | null {
  if (typeof window === 'undefined') return null;
  const haystack = `${window.location.search}${window.location.hash}`.toLowerCase();
  if (haystack.includes('disallowed_useragent')) {
    return 'disallowed_useragent';
  }
  return null;
}

export type GoogleSignInFlowResult =
  | { status: 'success'; user: User }
  | { status: 'cancelled' }
  | { status: 'popup-blocked' }
  | { status: 'redirecting' }
  | { status: 'webview-blocked' }
  | { status: 'error'; error: Error; nativeSetupRequired?: boolean };

export async function signInWithGoogleNative(auth: Auth, clientId: string): Promise<User> {
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

function nativeGoogleErrorMessage(err: unknown, isRtl: boolean): Error {
  const raw = err instanceof Error ? err.message : String(err);
  const needsSetup =
    /developer_error|10:|12500|idtoken|null/i.test(raw) ||
    raw.includes('DEVELOPER');

  if (needsSetup) {
    return new Error(
      isRtl
        ? 'إعداد Google للتطبيق غير مكتمل (SHA-1 / google-services.json). أعد بناء APK بعد إضافة تطبيق Android في Firebase.'
        : 'Google app setup incomplete (SHA-1 / google-services.json). Rebuild APK after adding the Android app in Firebase.',
    );
  }

  return new Error(
    isRtl
      ? `فشل تسجيل Google عبر التطبيق: ${raw}`
      : `Native Google sign-in failed: ${raw}`,
  );
}

/**
 * Unified Google sign-in.
 * - Native app: ONLY native plugin (never redirect inside WebView — causes 403).
 * - Real mobile browser: redirect.
 * - Desktop: popup, then redirect if blocked.
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
      const err = nativeGoogleErrorMessage(nativeErr, isRtl);
      const raw = nativeErr instanceof Error ? nativeErr.message : String(nativeErr);
      return {
        status: 'error',
        error: err,
        nativeSetupRequired: /developer_error|10:|12500|DEVELOPER/i.test(raw),
      };
    }
  }

  if (isInsecureOAuthWebView()) {
    return { status: 'webview-blocked' };
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
    if (isInsecureOAuthWebView()) {
      return { status: 'webview-blocked' };
    }
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

/** Mobile browsers and iframes — but NOT embedded WebViews. */
export function shouldPreferGoogleRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  if (isCapacitorNative() || isInsecureOAuthWebView()) return false;
  if (window.self !== window.top) return true;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || '',
  );
}
