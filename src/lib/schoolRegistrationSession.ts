import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

/** Prevents App shell / school boot UI while Firebase Auth is created during school signup. */
export const SCHOOL_REGISTRATION_SESSION_KEY = 'schoolix_completing_registration';
export const ADMIN_SIGNUP_STEP_KEY = 'schoolix_admin_signup_step';

export function markSchoolRegistrationInProgress(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(SCHOOL_REGISTRATION_SESSION_KEY, '1');
}

export function clearSchoolRegistrationInProgress(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(SCHOOL_REGISTRATION_SESSION_KEY);
}

export function isSchoolRegistrationInProgress(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(SCHOOL_REGISTRATION_SESSION_KEY) === '1';
}

export function persistAdminSignupStep(step: 'form' | 'packages' | 'done'): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(ADMIN_SIGNUP_STEP_KEY, step);
  if (step === 'packages') {
    markSchoolRegistrationInProgress();
  }
  if (step === 'form' || step === 'done') {
    sessionStorage.removeItem(ADMIN_SIGNUP_STEP_KEY);
  }
}

export function readAdminSignupStep(): 'form' | 'packages' | 'done' {
  if (typeof sessionStorage === 'undefined') return 'form';
  const step = sessionStorage.getItem(ADMIN_SIGNUP_STEP_KEY);
  if (step === 'packages' || step === 'done') return step;
  return 'form';
}

export function clearAdminSignupSession(): void {
  clearSchoolRegistrationInProgress();
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(ADMIN_SIGNUP_STEP_KEY);
  }
}

/** Pending subscription request — must not auto-provision school admin profile yet. */
export async function userHasPendingSchoolRegistration(
  uid: string,
  email?: string | null,
): Promise<boolean> {
  try {
    const byUid = query(
      collection(db, 'registrations'),
      where('uid', '==', uid),
      where('status', '==', 'pending'),
    );
    const uidSnap = await getDocs(byUid);
    if (!uidSnap.empty) return true;

    const normalized = email?.toLowerCase().trim();
    if (normalized) {
      const byEmail = query(
        collection(db, 'registrations'),
        where('email', '==', normalized),
        where('status', '==', 'pending'),
      );
      const emailSnap = await getDocs(byEmail);
      if (!emailSnap.empty) return true;
    }
  } catch (err) {
    console.warn('[schoolRegistrationSession] pending check failed:', err);
  }
  return false;
}
