import { signOut, type User } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { auth } from './firebase';
import {
  findProvisionedUserByEmail,
  healSchoolDataOnLogin,
} from './authLoginHelpers';
import { completeFirestoreProfile } from './completeAuthProfile';
import { UserRole } from '../types';
import { persistAdminSignupStep } from './schoolRegistrationSession';

function googleAdminSignupBlockedMsg(isRtl: boolean): string {
  return isRtl
    ? 'لتسجيل مدرسة جديدة استخدم البريد وكلمة المرور واملأ جميع بيانات المدرسة (ثم يمكنك استخدام Google لاحقاً).'
    : 'To register a new school, use email and password with all school fields (Google is available after signup).';
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
  const emailLower = user.email?.toLowerCase().trim() || '';

  if (
    pendingMode === 'signup' &&
    pendingRole === UserRole.ADMIN
  ) {
    const { data: provisionedData } = await findProvisionedUserByEmail(
      emailLower,
      user.uid,
    );
    if (!(provisionedData?.schoolId as string)) {
      toast.error(googleAdminSignupBlockedMsg(isRtl));
      await signOut(auth);
      return;
    }
  }

  const result = await completeFirestoreProfile({
    user,
    emailTrimmed: emailLower,
    displayName: user.displayName || '',
    selectedRole: pendingRole as UserRole,
    isRtl,
  });

  if (!result.ok) {
    toast.error(result.message);
    if (result.signOutRequired) {
      await signOut(auth);
    }
    return;
  }

  if (result.pendingSchoolAdmin) {
    persistAdminSignupStep('packages');
    toast.success(
      isRtl
        ? 'اختر الباقة لإرسال طلب اشتراك المدرسة'
        : 'Choose a package to submit your school subscription',
    );
    return;
  }

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
