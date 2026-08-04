import { Capacitor } from '@capacitor/core';
import type { User } from 'firebase/auth';
import { AppError } from '../AppError';

export type GoogleSignInResult = {
  user: User;
};

/**
 * Native Capacitor Google Auth plugin removed.
 * Web Google sign-in stays on Firebase Auth popup (googleSignIn.ts).
 */
export async function signInWithGoogleNative(): Promise<GoogleSignInResult> {
  if (Capacitor.getPlatform() === 'web') {
    throw new AppError('Native Google sign-in is not available on web', {
      code: 'auth/web-platform',
      source: 'auth',
    });
  }

  throw new AppError('Native Google sign-in is not available', {
    code: 'auth/native-unavailable',
    source: 'auth',
  });
}
