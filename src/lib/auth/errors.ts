import { AppError, isAppError, normalizeError } from '../AppError';

export type AuthErrorKind =
  | 'invalid-credential'
  | 'email-in-use'
  | 'weak-password'
  | 'too-many-requests'
  | 'user-disabled'
  | 'unauthorized-domain'
  | 'provider-disabled'
  | 'popup-blocked'
  | 'in-app-browser'
  | 'iframe-blocked'
  | 'cancelled'
  | 'unknown';

export function classifyAuthError(error: unknown): AuthErrorKind {
  const err = normalizeError(error);
  const code = err.code || '';
  const msg = err.message.toLowerCase();

  if (code === 'auth/in-app-browser') return 'in-app-browser';
  if (code === 'auth/iframe-blocked') return 'iframe-blocked';
  if (
    code === 'auth/popup-blocked' ||
    code === 'auth/cancelled-popup-request' ||
    msg.includes('popup-blocked')
  ) {
    return 'popup-blocked';
  }
  if (code === 'auth/popup-closed-by-user') return 'cancelled';
  if (
    code === 'auth/unauthorized-domain' ||
    code === 'auth/unauthorized-client' ||
    msg.includes('unauthorized-domain')
  ) {
    return 'unauthorized-domain';
  }
  if (
    code === 'auth/operation-not-allowed' ||
    msg.includes('operation-not-allowed') ||
    msg.includes('provider is disabled')
  ) {
    return 'provider-disabled';
  }
  if (
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential' ||
    code === 'INVALID_CREDENTIAL' ||
    msg.includes('invalid-credential')
  ) {
    return 'invalid-credential';
  }
  if (code === 'auth/email-already-in-use') return 'email-in-use';
  if (code === 'auth/weak-password') return 'weak-password';
  if (code === 'auth/too-many-requests') return 'too-many-requests';
  if (code === 'auth/user-disabled') return 'user-disabled';

  return 'unknown';
}

type TranslateFn = (key: string) => string;

export function getAuthErrorMessage(
  error: unknown,
  t: TranslateFn,
  isRtl: boolean,
): string {
  const kind = classifyAuthError(error);

  switch (kind) {
    case 'invalid-credential':
      return t('invalidCredential');
    case 'email-in-use':
      return t('emailInUse');
    case 'weak-password':
      return t('weakPassword');
    case 'too-many-requests':
      return t('tooManyRequests');
    case 'user-disabled':
      return t('userDisabled');
    case 'unauthorized-domain':
      return isRtl
        ? 'النطاق الحالي غير مصرح به في Firebase Console → Authentication → Authorized domains.'
        : 'This domain is not authorized in Firebase Console → Authentication → Authorized domains.';
    case 'provider-disabled':
      return isRtl
        ? 'تسجيل الدخول بـ Google غير مفعّل في Firebase Authentication.'
        : 'Google Sign-In is not enabled in Firebase Authentication.';
    case 'popup-blocked':
      return isRtl
        ? 'تم حظر النافذة المنبثقة. افتح الموقع في Chrome أو Safari ثم أعد المحاولة.'
        : 'Popup was blocked. Open the site in Chrome or Safari and try again.';
    case 'in-app-browser':
      return isRtl
        ? 'افتح الموقع في Chrome أو Safari — تسجيل Google لا يعمل داخل واتساب أو إنستغرام.'
        : 'Open the site in Chrome or Safari — Google sign-in does not work inside WhatsApp or Instagram.';
    case 'iframe-blocked':
      return isRtl
        ? 'افتح المنصة في تبويب كامل (ليس داخل معاينة مدمجة) لتسجيل الدخول بـ Google.'
        : 'Open the app in a full browser tab (not an embedded preview) to use Google sign-in.';
    case 'cancelled':
      return isRtl ? 'تم إلغاء تسجيل الدخول.' : 'Sign-in was cancelled.';
    default:
      return isAppError(error)
        ? error.message
        : normalizeError(error).message || t('authFailed');
  }
}

export function toAuthAppError(error: unknown, fallback?: string): AppError {
  return normalizeError(error, fallback ?? 'Authentication failed');
}
