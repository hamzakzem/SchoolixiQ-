import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';
import { AppError, normalizeError } from '../AppError';
import { classifyAuthError } from './errors';
import {
  healSchoolDataOnLogin,
  provisionUserProfile,
  type SchoolSignupFields,
} from './profileProvisioning';
import { UserRole } from '../../types';

export function validatePasswordComplexity(pwd: string): {
  isValid: boolean;
  message: string;
} {
  if (pwd.length < 6) {
    return {
      isValid: false,
      message: 'Password must be at least 6 characters',
    };
  }
  if (/^(123456|12345678|abcdef|111111|000000|qwerty)$/i.test(pwd)) {
    return {
      isValid: false,
      message: 'This password is too simple and easy to guess',
    };
  }
  if (pwd.split('').every((char) => char === pwd[0])) {
    return {
      isValid: false,
      message: 'Password cannot consist of a single repeating character',
    };
  }
  return { isValid: true, message: '' };
}

export type EmailSignUpInput = {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  selectedRole: UserRole;
  school?: SchoolSignupFields;
  isRtl: boolean;
  sendVerification?: boolean;
};

export async function signUpWithEmail(input: EmailSignUpInput): Promise<User> {
  const emailTrimmed = input.email.toLowerCase().trim();
  const result = await createUserWithEmailAndPassword(
    auth,
    emailTrimmed,
    input.password,
  );
  const user = result.user;

  await updateProfile(user, { displayName: input.displayName });

  if (input.sendVerification !== false) {
    try {
      auth.languageCode = input.isRtl ? 'ar' : 'en';
      await sendEmailVerification(user);
    } catch (verifErr) {
      console.warn('Verification email failed', verifErr);
    }
  }

  await provisionUserProfile({
    user,
    selectedRole: input.selectedRole,
    displayName: input.displayName,
    phone: input.phone,
    school: input.school,
    isRtl: input.isRtl,
  });

  return user;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const emailTrimmed = email.toLowerCase().trim();

  try {
    const result = await signInWithEmailAndPassword(auth, emailTrimmed, password);
    try {
      await healSchoolDataOnLogin(emailTrimmed, result.user.uid);
    } catch (healErr) {
      console.warn('Heal school data on login failed', healErr);
    }
    return result.user;
  } catch (signInErr) {
    if (password.trim() !== password) {
      try {
        const retry = await signInWithEmailAndPassword(
          auth,
          emailTrimmed,
          password.trim(),
        );
        return retry.user;
      } catch {
        /* fall through */
      }
    }

    const kind = classifyAuthError(signInErr);
    if (kind === 'invalid-credential') {
      try {
        const activated = await createUserWithEmailAndPassword(
          auth,
          emailTrimmed,
          password,
        );
        return activated.user;
      } catch (signUpErr) {
        const signUpKind = classifyAuthError(signUpErr);
        if (signUpKind !== 'email-in-use') {
          console.warn('Auto activation signUp failed', signUpErr);
        }
      }
    }

    throw normalizeError(signInErr, 'Sign-in failed');
  }
}

export async function resetPassword(email: string): Promise<void> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    throw new AppError('Email is required', {
      code: 'auth/missing-email',
      source: 'auth',
    });
  }
  await sendPasswordResetEmail(auth, trimmed);
}
