import { signOut, type User } from 'firebase/auth';
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
import { toast } from 'react-hot-toast';
import { auth, db } from './firebase';
import {
  findProvisionedUserByEmail,
  healSchoolDataOnLogin,
  resolveSignupRole,
  signupRoleConflict,
} from './authLoginHelpers';
import { UserRole } from '../types';

function googleAdminSignupBlockedMsg(isRtl: boolean): string {
  return isRtl
    ? 'لتسجيل مدرسة جديدة استخدم البريد وكلمة المرور واملأ جميع بيانات المدرسة (Google متاح بعد إنشاء الحساب).'
    : 'To register a new school, use email and password and complete all school fields (Google is available after signup).';
}

/**
 * Create / link Firestore profile after Firebase Auth (Google popup, redirect, or native).
 */
export async function finalizeGoogleSignIn(
  user: User,
  pendingRole: string,
  pendingMode: string,
  isRtl: boolean,
): Promise<void> {
  const userDoc = await getDoc(doc(db, 'users', user.uid));

  if (!userDoc.exists()) {
    const emailLower = user.email?.toLowerCase() || '';
    const { data: provisionedData, oldDocId } = await findProvisionedUserByEmail(
      emailLower,
      user.uid,
    );

    if (
      pendingMode === 'signup' &&
      pendingRole === UserRole.ADMIN &&
      !(provisionedData?.schoolId as string)
    ) {
      toast.error(googleAdminSignupBlockedMsg(isRtl));
      await signOut(auth);
      return;
    }

    let isFirstUser = false;
    try {
      const metadataSnap = await getDoc(doc(db, 'users', 'metadata'));
      isFirstUser = !metadataSnap.exists();
    } catch {
      /* metadata optional */
    }

    const conflict = signupRoleConflict(
      provisionedData?.role as string | undefined,
      pendingRole as UserRole,
      isRtl,
    );
    if (conflict) {
      toast.error(conflict);
      await signOut(auth);
      return;
    }

    const finalRole = resolveSignupRole(
      isFirstUser,
      provisionedData?.role as string | undefined,
      pendingRole as UserRole,
    );

    await setDoc(doc(db, 'users', user.uid), {
      name:
        user.displayName ||
        (provisionedData?.name as string) ||
        (isRtl ? 'مستخدم جديد' : 'New User'),
      email: user.email,
      role: finalRole,
      schoolId: (provisionedData?.schoolId as string) || '',
      createdAt: new Date().toISOString(),
      uid: user.uid,
      photoURL: user.photoURL,
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
    toast.success(isRtl ? 'تم تسجيل الدخول بنجاح!' : 'Login Success!');
    return;
  }

  const emailLower = user.email?.toLowerCase() || '';
  if (emailLower) {
    try {
      await healSchoolDataOnLogin(emailLower, user.uid);
    } catch (healErr) {
      console.warn('healSchoolDataOnLogin after Google:', healErr);
    }
  }
  toast.success(
    isRtl
      ? `مرحباً ${user.displayName || ''}`
      : `Welcome ${user.displayName || ''}`,
  );
}
