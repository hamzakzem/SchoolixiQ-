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
import { db } from './firebase';
import { syncUserClaims } from './adminApi';
import {
  findProvisionedUserByEmail,
  isPlatformUninitialized,
  resolveSignupRole,
  signupRoleConflict,
} from './authLoginHelpers';
import { UserRole } from '../types';

export type CompleteProfileInput = {
  user: User;
  emailTrimmed: string;
  displayName: string;
  selectedRole: UserRole;
  phone?: string;
  isRtl: boolean;
};

export type CompleteProfileResult =
  | { ok: true; pendingSchoolAdmin: false; finalRole: UserRole }
  | { ok: true; pendingSchoolAdmin: true }
  | { ok: false; message: string; signOutRequired: boolean };

/**
 * After Firebase Auth succeeds (email/password or Google), create/link Firestore users doc.
 */
export async function completeFirestoreProfile(
  input: CompleteProfileInput,
): Promise<CompleteProfileResult> {
  const { user, emailTrimmed, displayName, selectedRole, phone, isRtl } = input;

  const existing = await getDoc(doc(db, 'users', user.uid));
  if (existing.exists()) {
    try {
      await syncUserClaims(user.uid);
      await user.getIdToken(true);
    } catch {
      /* non-fatal */
    }
    return {
      ok: true,
      pendingSchoolAdmin: false,
      finalRole: (existing.data()?.role as UserRole) || selectedRole,
    };
  }

  const { data: provisionedData, oldDocId } = await findProvisionedUserByEmail(
    emailTrimmed,
    user.uid,
  );

  const conflict = signupRoleConflict(
    provisionedData?.role as string | undefined,
    selectedRole,
    isRtl,
  );
  if (conflict) {
    return { ok: false, message: conflict, signOutRequired: true };
  }

  const isFirstUser = await isPlatformUninitialized();
  const provisionedSchoolId = (provisionedData?.schoolId as string) || '';
  const pendingSchoolAdmin =
    selectedRole === UserRole.ADMIN && !isFirstUser && !provisionedSchoolId;

  if (pendingSchoolAdmin) {
    return { ok: true, pendingSchoolAdmin: true };
  }

  const finalRole = resolveSignupRole(
    isFirstUser,
    provisionedData?.role as string | undefined,
    selectedRole,
  );

  await setDoc(doc(db, 'users', user.uid), {
    name: displayName || (provisionedData?.name as string) || (isRtl ? 'مستخدم جديد' : 'New User'),
    email: emailTrimmed,
    role: finalRole,
    phone: phone || '',
    schoolId: provisionedSchoolId,
    createdAt: new Date().toISOString(),
    uid: user.uid,
    photoURL: user.photoURL || null,
  });

  if (oldDocId && oldDocId !== user.uid) {
    const studentsQ = query(
      collection(db, 'students'),
      where('parentIds', 'array-contains', oldDocId),
    );
    const studentsSnap = await getDocs(studentsQ);
    await Promise.all(
      studentsSnap.docs.map((studentDoc) => {
        const currentIds = studentDoc.data().parentIds || [];
        const updatedIds = currentIds.map((id: string) =>
          id === oldDocId ? user.uid : id,
        );
        return updateDoc(doc(db, 'students', studentDoc.id), {
          parentIds: updatedIds,
        });
      }),
    );
    await deleteDoc(doc(db, 'users', oldDocId));
  }

  if (isFirstUser) {
    await setDoc(doc(db, 'users', 'metadata'), { initialized: true });
  }

  try {
    await syncUserClaims(user.uid);
    await user.getIdToken(true);
  } catch {
    /* claims sync is best-effort; Firestore profile is source of truth */
  }

  return { ok: true, pendingSchoolAdmin: false, finalRole };
}
