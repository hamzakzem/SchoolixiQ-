import type { Auth, User } from 'firebase/auth';
import { auth } from './firebase';
import { consumeGoogleRedirectResult } from './googleAuthFlow';
import { finalizeGoogleSignIn } from './googleProfileSetup';
import {
  clearGoogleAuthContext,
  parseGoogleOAuthUrlError,
  cleanGoogleOAuthParamsFromUrl,
  readGoogleAuthContext,
} from './googleAuthSession';
import {
  clearGoogleRedirectPending,
  isGoogleRedirectPending,
  isFirebaseOAuthReturnUrl,
} from './oauthReturnGuard';

export type GoogleRedirectBootstrapResult = {
  user: User | null;
  urlError: ReturnType<typeof parseGoogleOAuthUrlError>;
  profileError: Error | null;
};

function readIsRtl(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const lang = localStorage.getItem('schoolixiq_lang') || localStorage.getItem('language');
    if (lang === 'en') return false;
    if (lang === 'ar') return true;
  } catch {
    /* ignore */
  }
  return document.documentElement.dir !== 'ltr';
}

async function runGoogleRedirectBootstrap(authInstance: Auth): Promise<GoogleRedirectBootstrapResult> {
  const hadRedirectHint =
    isGoogleRedirectPending() || isFirebaseOAuthReturnUrl();
  const isRtl = readIsRtl();

  try {
    const urlError = parseGoogleOAuthUrlError();
    if (urlError) {
      cleanGoogleOAuthParamsFromUrl();
      clearGoogleAuthContext();
      clearGoogleRedirectPending();
      return { user: null, urlError, profileError: null };
    }

    // Firebase: call getRedirectResult on every load (cheap no-op when not returning from OAuth)
    let user: User | null = await consumeGoogleRedirectResult(authInstance, isRtl);
    await authInstance.authStateReady();
    if (!user && authInstance.currentUser) {
      user = authInstance.currentUser;
    }

    clearGoogleRedirectPending();

    if (!user) {
      if (hadRedirectHint) {
        return {
          user: null,
          urlError: null,
          profileError: new Error(
            isRtl
              ? 'تعذر إكمال تسجيل Google بعد إعادة التحميل. جرّب Chrome/Safari أو سجّل بالبريد وكلمة المرور.'
              : 'Could not finish Google sign-in after reload. Try Chrome/Safari or use email and password.',
          ),
        };
      }
      return { user: null, urlError: null, profileError: null };
    }

    const { role: pendingRole, mode: pendingMode } = readGoogleAuthContext();
    clearGoogleAuthContext();

    try {
      await finalizeGoogleSignIn(user, pendingRole, pendingMode, isRtl);
      return { user, urlError: null, profileError: null };
    } catch (profileErr) {
      console.error('[Google redirect] profile setup failed:', profileErr);
      return {
        user,
        urlError: null,
        profileError:
          profileErr instanceof Error ? profileErr : new Error(String(profileErr)),
      };
    }
  } catch (err) {
    clearGoogleRedirectPending();
    console.error('[Google redirect] getRedirectResult failed:', err);
    return {
      user: null,
      urlError: null,
      profileError: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/** Started at module load — before React, so OAuth state is not lost after refresh */
export const googleRedirectBootstrapPromise: Promise<GoogleRedirectBootstrapResult> =
  typeof window !== 'undefined'
    ? runGoogleRedirectBootstrap(auth)
    : Promise.resolve({ user: null, urlError: null, profileError: null });

export function waitForGoogleRedirectBootstrap(): Promise<GoogleRedirectBootstrapResult> {
  return googleRedirectBootstrapPromise;
}
