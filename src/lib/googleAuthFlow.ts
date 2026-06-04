import { Capacitor } from '@capacitor/core';
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithCredential,
  type Auth,
  type User,
} from 'firebase/auth';
import { initNativeGoogleAuth } from './initNativeGoogleAuth';
import { signInWithGoogleRedirectWeb, signInWithGoogleWeb } from './googleAuthWeb';
import { mapGoogleAuthError } from './googleAuthErrors';

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
  // Native app uses @codetrix-studio/capacitor-google-auth — not embedded OAuth WebView
  if (isCapacitorNative()) return false;

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
    m.includes("doesn't comply with google's policies")
  );
}

/** Read OAuth error returned in URL after a blocked redirect attempt */
export function detectGoogleOAuthUrlError(): string | null {
  if (typeof window === 'undefined') return null;
  const haystack = `${window.location.search}${window.location.hash}`.toLowerCase();
  if (haystack.includes('disallowed_useragent')) {
    return 'disallowed_useragent';
  }
  if (haystack.includes('access_denied') || haystack.includes('error=access_denied')) {
    return 'access_denied';
  }
  return null;
}

/** Single promise per full page load — never call getRedirectResult twice (invalidates OAuth nonce) */
let redirectResultPromise: Promise<User | null> | null = null;

/** After signInWithRedirect — call once when the app loads again */
export async function consumeGoogleRedirectResult(
  auth: Auth,
  isRtl = false,
): Promise<User | null> {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth)
      .then((result) => result?.user ?? null)
      .catch((err) => {
        const mapped = mapGoogleAuthError(err, isRtl);
        throw new Error(mapped.message);
      });
  }
  return redirectResultPromise;
}

export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'GoogleSignInCancelledError';
  }
}

export type GoogleSignInFlowResult =
  | { status: 'success'; user: User }
  | { status: 'cancelled' }
  | { status: 'popup-blocked' }
  | { status: 'redirecting' }
  | { status: 'webview-blocked' }
  | { status: 'error'; error: Error; nativeSetupRequired?: boolean };

function isGoogleCancelledError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return /cancel|12501|user closed|user denied|sign in cancelled|aborted/i.test(raw);
}

function isNativeSetupError(raw: string): boolean {
  return /developer_error|10:|12500|DEVELOPER|idtoken|null|invalid_audience/i.test(raw);
}

export async function signInWithGoogleNative(auth: Auth): Promise<User> {
  await initNativeGoogleAuth();
  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');

  let googleUser;
  try {
    googleUser = await GoogleAuth.signIn();
  } catch (err) {
    if (isGoogleCancelledError(err)) {
      throw new GoogleSignInCancelledError();
    }
    throw err;
  }

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

  if (isNativeSetupError(raw)) {
    return new Error(
      isRtl
        ? 'إعداد Google للتطبيق غير مكتمل. في Firebase أضف بصمة SHA-1 ثم أعد بناء APK (npm run prepare-apk:build) وثبّت النسخة الجديدة.'
        : 'Google app setup incomplete. Add SHA-1 in Firebase, rebuild APK, and reinstall.',
    );
  }

  if (/auth\/invalid-credential|invalid-credential|invalid id token/i.test(raw)) {
    return new Error(
      isRtl
        ? 'رمز Google غير صالح. تأكد من تفعيل تسجيل Google في Firebase Authentication وأن SHA-1 مضاف لتطبيق Android.'
        : 'Invalid Google token. Enable Google in Firebase Auth and add Android SHA-1.',
    );
  }

  return new Error(
    isRtl ? `تعذر الدخول بـ Google: ${raw}` : `Google sign-in failed: ${raw}`,
  );
}

/**
 * Unified Google sign-in — one button.
 * - Native app: account picker (Capacitor plugin).
 * - Web: redirect (أكثر موثوقية من popup مع Safari / حظر الكوكيز).
 * - Popup: احتياطي عبر signInWithGoogleWebPopup فقط.
 */
export async function runGoogleSignInFlow(
  auth: Auth,
  isRtl: boolean,
): Promise<GoogleSignInFlowResult> {
  auth.languageCode = isRtl ? 'ar' : 'en';

  if (isCapacitorNative()) {
    try {
      const user = await signInWithGoogleNative(auth);
      return { status: 'success', user };
    } catch (nativeErr) {
      if (nativeErr instanceof GoogleSignInCancelledError) {
        return { status: 'cancelled' };
      }
      const raw = nativeErr instanceof Error ? nativeErr.message : String(nativeErr);
      const err = nativeGoogleErrorMessage(nativeErr, isRtl);
      return {
        status: 'error',
        error: err,
        nativeSetupRequired: isNativeSetupError(raw),
      };
    }
  }

  if (isInsecureOAuthWebView()) {
    return { status: 'webview-blocked' };
  }

  // Popup keeps the same tab — avoids full reload that breaks getRedirectResult
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
      const mapped = mapGoogleAuthError(redirectErr, isRtl);
      if (mapped.cancelled) return { status: 'cancelled' };
      return { status: 'error', error: new Error(mapped.message) };
    }
  }

  const mapped = mapGoogleAuthError(webResult.error, isRtl);
  return { status: 'error', error: new Error(mapped.message) };
}

/** Optional popup path (desktop browsers with pop-ups allowed) */
export async function runGoogleSignInPopupFlow(
  auth: Auth,
  isRtl: boolean,
): Promise<GoogleSignInFlowResult> {
  auth.languageCode = isRtl ? 'ar' : 'en';
  if (isCapacitorNative() || isInsecureOAuthWebView()) {
    return runGoogleSignInFlow(auth, isRtl);
  }

  const webResult = await signInWithGoogleWeb(auth);
  if (webResult.ok) {
    return { status: 'success', user: webResult.user };
  }
  if (webResult.cancelled) {
    return { status: 'cancelled' };
  }
  if (webResult.popupBlocked) {
    await signInWithGoogleRedirectWeb(auth);
    return { status: 'redirecting' };
  }
  const mapped = mapGoogleAuthError(webResult.error, isRtl);
  return { status: 'error', error: new Error(mapped.message) };
}

/** Web: redirect أكثر استقراراً من popup على الجوال و Safari */
export function shouldPreferGoogleRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  if (isCapacitorNative() || isInsecureOAuthWebView()) return false;
  return true;
}
