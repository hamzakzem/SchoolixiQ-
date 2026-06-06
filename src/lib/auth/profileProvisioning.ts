import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole } from '../../types';

export type SchoolSignupFields = {
  phone?: string;
  address?: string;
  governorate?: string;
  directorate?: string;
  educationLevel?: string;
  workingHours?: string;
  studyType?: string;
  estimatedStudents?: string;
};

export type ProvisionProfileInput = {
  user: User;
  selectedRole: UserRole | string;
  displayName?: string;
  phone?: string;
  school?: SchoolSignupFields;
  isRtl: boolean;
};

type ProvisionedLookup = {
  data: Record<string, unknown> | null;
  oldDocId: string;
};

async function findProvisionedByEmail(email: string): Promise<ProvisionedLookup> {
  const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return { data: null, oldDocId: '' };
  const found = snap.docs[0];
  return { data: found.data() as Record<string, unknown>, oldDocId: found.id };
}

async function isPlatformUninitialized(): Promise<boolean> {
  try {
    const metadataSnap = await getDoc(doc(db, 'users', 'metadata'));
    return !metadataSnap.exists();
  } catch {
    return false;
  }
}

function resolveFinalRole(
  selectedRole: UserRole | string,
  provisionedRole: string | undefined,
  isFirstUser: boolean,
): UserRole | string {
  if (isFirstUser) return UserRole.SUPERADMIN;
  const role = provisionedRole || selectedRole;
  if (role === 'superadmin' && !isFirstUser) return UserRole.ADMIN;
  return role;
}

function signupRoleConflict(
  provisionedRole: string | undefined,
  selectedRole: UserRole | string,
  isRtl: boolean,
): string | null {
  const management = ['admin', 'staff', 'assistant', 'superadmin'];
  if (
    provisionedRole &&
    management.includes(provisionedRole) &&
    (selectedRole === UserRole.PARENT || selectedRole === UserRole.TEACHER)
  ) {
    return isRtl
      ? 'هذا الحساب مسجل كإدارة مدرسة ولا يمكن استخدامه كمعلم أو ولي أمر بنفس البريد'
      : 'This email is registered as school staff and cannot be used as parent or teacher';
  }
  return null;
}

async function migrateProvisionedStudents(
  oldDocId: string,
  newUid: string,
): Promise<void> {
  if (!oldDocId || oldDocId === newUid) return;

  const studentsQ = query(
    collection(db, 'students'),
    where('parentIds', 'array-contains', oldDocId),
  );
  const studentsSnap = await getDocs(studentsQ);

  await Promise.all(
    studentsSnap.docs.map((studentDoc) => {
      const currentIds = studentDoc.data().parentIds || [];
      const updatedIds = currentIds.map((id: string) =>
        id === oldDocId ? newUid : id,
      );
      return updateDoc(doc(db, 'students', studentDoc.id), { parentIds: updatedIds });
    }),
  );

  await deleteDoc(doc(db, 'users', oldDocId));
}

/**
 * Create or link Firestore user profile after Firebase Auth succeeds.
 * Returns true when a new profile was created.
 */
export async function provisionUserProfile(
  input: ProvisionProfileInput,
): Promise<{ created: boolean; isFirstUser: boolean }> {
  const { user } = input;
  const email = user.email?.toLowerCase() || '';

  const existing = await getDoc(doc(db, 'users', user.uid));
  if (existing.exists()) {
    return { created: false, isFirstUser: false };
  }

  // School admins must complete pending subscription registration — never auto-provision here.
  if (input.selectedRole === UserRole.ADMIN) {
    return { created: false, isFirstUser: false };
  }

  const { data: provisionedData, oldDocId } = email
    ? await findProvisionedByEmail(email)
    : { data: null, oldDocId: '' };

  const conflict = signupRoleConflict(
    provisionedData?.role as string | undefined,
    input.selectedRole,
    input.isRtl,
  );
  if (conflict) {
    throw new Error(conflict);
  }

  const isFirstUser = await isPlatformUninitialized();
  const finalRole = resolveFinalRole(
    input.selectedRole,
    provisionedData?.role as string | undefined,
    isFirstUser,
  );

  const schoolId = (provisionedData?.schoolId as string) || '';

  await setDoc(doc(db, 'users', user.uid), {
    name:
      input.displayName ||
      user.displayName ||
      (provisionedData?.name as string) ||
      (input.isRtl ? 'مستخدم جديد' : 'New User'),
    email: user.email,
    role: finalRole,
    phone: input.phone || (provisionedData?.phone as string) || '',
    schoolId,
    createdAt: new Date().toISOString(),
    uid: user.uid,
    photoURL: user.photoURL || null,
  });

  await migrateProvisionedStudents(oldDocId, user.uid);

  if (isFirstUser) {
    await setDoc(doc(db, 'users', 'metadata'), { initialized: true });
  }

  return { created: true, isFirstUser };
}

/** Self-heal missing school fields from registration data on admin login. */
export async function healSchoolDataOnLogin(
  email: string,
  uid: string,
): Promise<void> {
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

  const byCustomerEmail = await getDocs(
    query(registrationsRef, where('customerInfo.email', '==', email)),
  );
  if (!byCustomerEmail.empty) {
    regData = byCustomerEmail.docs[0].data();
  } else {
    const byEmail = await getDocs(
      query(registrationsRef, where('email', '==', email)),
    );
    if (!byEmail.empty) regData = byEmail.docs[0].data();
  }

  if (!regData) return;

  const regFields = (regData.customerInfo as Record<string, unknown>) || regData;
  const updatePayload: Record<string, unknown> = {};

  if (regFields.name && !schoolData.name) updatePayload.name = regFields.name;
  if (regFields.phone && !schoolData.phone) {
    updatePayload.phone = regFields.phone;
    updatePayload.adminPhone = regFields.phone;
  }
  if (regFields.address && !schoolData.address) updatePayload.address = regFields.address;
  if (regFields.governorate && !schoolData.governorate) {
    updatePayload.governorate = regFields.governorate;
  }
  if (regFields.directorate && !schoolData.directorate) {
    updatePayload.directorate = regFields.directorate;
  }

  const eduLvl = regFields.educationLevel || regFields.stage;
  if (eduLvl && (!schoolData.educationLevel || !schoolData.stage)) {
    updatePayload.educationLevel = eduLvl;
    updatePayload.stage = eduLvl;
  }

  const wrkHrs = regFields.workingHours || regFields.shift;
  if (wrkHrs && (!schoolData.workingHours || !schoolData.shift)) {
    updatePayload.workingHours = wrkHrs;
    updatePayload.shift = wrkHrs;
  }

  const stdTyp = regFields.studyType || regFields.genderType;
  if (stdTyp && (!schoolData.studyType || !schoolData.genderType)) {
    updatePayload.studyType = stdTyp;
    updatePayload.genderType = stdTyp;
  }

  const estStud =
    regFields.estimatedStudents !== undefined
      ? regFields.estimatedStudents
      : regFields.approximateStudents;
  if (estStud !== undefined && schoolData.estimatedStudents === undefined) {
    updatePayload.estimatedStudents = Number(estStud) || 0;
    updatePayload.approximateStudents = String(estStud);
  }

  if (Object.keys(updatePayload).length > 0) {
    await updateDoc(schoolDocRef, updatePayload);
  }
}
