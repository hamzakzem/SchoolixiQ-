function isGoogleDisallowedUserAgentError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('disallowed_useragent') ||
    m.includes('403') ||
    m.includes('secure browsers') ||
    m.includes('متصفحات آمنة') ||
    m.includes("doesn't comply with google's policies")
  );
}

export type GoogleAuthUiError = {
  unauthorizedDomain: boolean;
  providerDisabled: boolean;
  webViewBlocked: boolean;
  popupBlocked: boolean;
  cancelled: boolean;
  message: string;
  rawCode: string;
};

export function mapGoogleAuthError(
  err: unknown,
  isRtl: boolean,
): GoogleAuthUiError {
  const error = err as { code?: string; message?: string };
  const errorCode = error.code || '';
  const errorMessage = error.message || String(err);

  const base: GoogleAuthUiError = {
    unauthorizedDomain: false,
    providerDisabled: false,
    webViewBlocked: false,
    popupBlocked: false,
    cancelled: false,
    message: errorMessage,
    rawCode: errorCode,
  };

  if (
    errorCode === 'auth/popup-closed-by-user' ||
    /cancel/i.test(errorMessage)
  ) {
    return { ...base, cancelled: true, message: '' };
  }

  if (
    errorCode === 'auth/popup-blocked' ||
    errorCode === 'auth/cancelled-popup-request'
  ) {
    return {
      ...base,
      popupBlocked: true,
      message: isRtl
        ? 'المتصفح منع نافذة Google. استخدم زر «متابعة عبر Google».'
        : 'Pop-up blocked. Use Continue with Google.',
    };
  }

  if (
    errorCode === 'auth/unauthorized-domain' ||
    errorCode === 'auth/unauthorized-client' ||
    errorMessage.includes('unauthorized-domain') ||
    errorMessage.toLowerCase().includes('unauthorized domain')
  ) {
    return {
      ...base,
      unauthorizedDomain: true,
      message: isRtl
        ? 'هذا النطاق غير مفعّل لتسجيل Google في Firebase. أضف النطاق في Authorized domains.'
        : 'Domain not authorized for Google in Firebase Authorized domains.',
    };
  }

  if (
    errorCode === 'auth/operation-not-allowed' ||
    errorMessage.includes('OPERATION_NOT_ALLOWED')
  ) {
    return {
      ...base,
      providerDisabled: true,
      message: isRtl
        ? 'تسجيل Google غير مفعّل في Firebase Authentication.'
        : 'Google sign-in is disabled in Firebase Authentication.',
    };
  }

  if (isGoogleDisallowedUserAgentError(errorMessage)) {
    return {
      ...base,
      webViewBlocked: true,
      message: isRtl
        ? 'افتح schoolixiq.com في Safari أو Chrome — وليس من داخل واتساب أو إنستغرام.'
        : 'Open schoolixiq.com in Safari or Chrome, not in-app browsers.',
    };
  }

  if (errorCode === 'auth/account-exists-with-different-credential') {
    return {
      ...base,
      message: isRtl
        ? 'هذا البريد مسجّل بطريقة أخرى. سجّل الدخول بالبريد وكلمة المرور.'
        : 'Email registered with another method. Use email and password.',
    };
  }

  return {
    ...base,
    message:
      errorMessage ||
      (isRtl ? 'تعذر تسجيل الدخول بـ Google' : 'Google sign-in failed'),
  };
}
