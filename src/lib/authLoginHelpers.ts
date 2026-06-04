import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserRole } from '../types';

const MANAGEMENT_ROLES = new Set(['admin', 'staff', 'assistant', 'superadmin']);

export function isManagementRole(role?: string): boolean {
  return !!role && MANAGEMENT_ROLES.has(role);
}

/** Requires signed-in user (Firestore rules allow list when email matches). */
export async function findProvisionedUserByEmail(
  emailTrimmed: string,
  excludeUid?: string,
): Promise<{ data: Record<string, unknown> | null; oldDocId: string }> {
  const q = query(collection(db, 'users'), where('email', '==', emailTrimmed));
  const snap = await getDocs(q);

  for (const found of snap.docs) {
    if (excludeUid && found.id === excludeUid) continue;
    return { data: found.data() as Record<string, unknown>, oldDocId: found.id };
  }

  return { data: null, oldDocId: '' };
}

export async function isPlatformUninitialized(): Promise<boolean> {
  try {
    const metadataSnap = await getDoc(doc(db, 'users', 'metadata'));
    return !metadataSnap.exists();
  } catch {
    return false;
  }
}

/** After successful login: copy missing school fields from registrations. */
export async function healSchoolDataOnLogin(emailTrimmed: string, uid: string): Promise<void> {
  const userDocSnap = await getDoc(doc(db, 'users', uid));
  if (!userDocSnap.exists()) return;

  const userData = userDocSnap.data();
  if (userData?.role !== 'admin' || !userData?.schoolId) return;

  const schoolDocRef = doc(db, 'schools', userData.schoolId);
  const schoolDocSnap = await getDoc(schoolDocRef);
  if (!schoolDocSnap.exists()) return;

  const schoolData = schoolDocSnap.data();
  if (
    schoolData.governorate &&
    schoolData.directorate &&
    schoolData.estimatedStudents !== undefined
  ) {
    return;
  }

  const registrationsRef = collection(db, 'registrations');
  let regData: Record<string, unknown> | null = null;

  const byCustomerEmail = query(
    registrationsRef,
    where('customerInfo.email', '==', emailTrimmed),
  );
  const regDocs = await getDocs(byCustomerEmail);
  if (!regDocs.empty) regData = regDocs.docs[0].data();

  if (!regData) {
    const byEmail = query(registrationsRef, where('email', '==', emailTrimmed));
    const regDocs2 = await getDocs(byEmail);
    if (!regDocs2.empty) regData = regDocs2.docs[0].data();
  }

  if (!regData) return;

  const regFields = (regData.customerInfo as Record<string, unknown>) || regData;
  const updatePayload: Record<string, unknown> = {};

  if (regFields.address && !schoolData.address) updatePayload.address = regFields.address;
  if (regFields.governorate && !schoolData.governorate) {
    updatePayload.governorate = regFields.governorate;
  }
  if (regFields.directorate && !schoolData.directorate) {
    updatePayload.directorate = regFields.directorate;
  }

  const level = regFields.educationLevel || regFields.stage;
  if (level && !schoolData.educationLevel && !schoolData.stage) {
    updatePayload.educationLevel = level;
    updatePayload.stage = level;
  }

  const hours = regFields.workingHours || regFields.shift;
  if (hours && !schoolData.workingHours && !schoolData.shift) {
    updatePayload.workingHours = hours;
    updatePayload.shift = hours;
  }

  const study = regFields.studyType || regFields.genderType;
  if (study && !schoolData.studyType && !schoolData.genderType) {
    updatePayload.studyType = study;
    updatePayload.genderType = study;
  }

  const est = regFields.estimatedStudents ?? regFields.approximateStudents;
  if (est !== undefined && est !== '' && schoolData.estimatedStudents === undefined) {
    updatePayload.estimatedStudents = Number(est) || 0;
    updatePayload.approximateStudents = String(est);
  }

  if (Object.keys(updatePayload).length > 0) {
    await updateDoc(schoolDocRef, updatePayload);
  }
}

export function resolveSignupRole(
  isFirstUser: boolean,
  provisionedRole: string | undefined,
  selectedRole: UserRole,
): UserRole {
  let finalRole = isFirstUser ? UserRole.SUPERADMIN : (provisionedRole as UserRole) || selectedRole;
  if (finalRole === UserRole.SUPERADMIN && !isFirstUser) finalRole = UserRole.ADMIN;
  return finalRole;
}

export function signupRoleConflict(
  provisionedRole: string | undefined,
  selectedRole: UserRole,
  isRtl: boolean,
): string | null {
  if (!provisionedRole) return null;

  if (isManagementRole(provisionedRole) && selectedRole === UserRole.PARENT) {
    return isRtl
      ? 'هذا البريد مسجل كإدارة مدرسة. اختر «إدارة مدرسة» أو سجّل الدخول.'
      : 'This email is registered for school management. Choose school admin or sign in.';
  }

  if (provisionedRole === UserRole.PARENT && selectedRole === UserRole.ADMIN) {
    return isRtl
      ? 'هذا البريد مسجل كولي أمر. اختر «ولي أمر» أو استخدم بريداً آخر.'
      : 'This email is registered as a parent. Choose parent or use another email.';
  }

  return null;
}
