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

export function getEmailAuthErrorMessage(
  error: unknown,
  t: TranslateFn,
  isRtl: boolean,
): string {
  const err = normalizeError(error);
  const code = err.code || '';

  if (import.meta.env.DEV) {
    console.error('[Auth] EMAIL_AUTH_ERROR', { code });
  }

  if (isRtl) {
    const arByCode: Record<string, string> = {
      'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
      'auth/user-not-found': 'لا يوجد حساب بهذا البريد',
      'auth/wrong-password': 'كلمة المرور غير صحيحة',
      'auth/email-already-in-use': 'هذا البريد مستخدم مسبقاً',
      'auth/weak-password': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      'auth/invalid-email': 'البريد الإلكتروني غير صالح',
      'auth/operation-not-allowed':
        'تسجيل الدخول بالبريد وكلمة المرور غير مفعل',
    };
    if (arByCode[code]) return arByCode[code];
  } else {
    const enByCode: Record<string, string> = {
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/user-not-found': 'No account found for this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'This email is already in use.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/operation-not-allowed': 'Email/password sign-in is not enabled.',
    };
    if (enByCode[code]) return enByCode[code];
  }

  return getAuthErrorMessage(error, t, isRtl);
}

export function toAuthAppError(error: unknown, fallback?: string): AppError {
  return normalizeError(error, fallback ?? 'Authentication failed');
}
