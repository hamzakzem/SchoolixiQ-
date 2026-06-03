import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

/** Prevents App shell / school boot UI while Firebase Auth is created during school signup. */
export const SCHOOL_REGISTRATION_SESSION_KEY = 'schoolix_completing_registration';

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
