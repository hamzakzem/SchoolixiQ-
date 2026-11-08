import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AppError } from '../AppError';

/** How long the user may wait for the server to confirm the request before we say so. */
export const REGISTRATION_CONFIRM_TIMEOUT_MS = 15000;

function withTimeout<T>(task: Promise<T>, ms: number, code: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AppError('timeout', { code, source: 'auth' })), ms);
    task.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export type AdminRegistrationCustomerInfo = {
  /** School name */
  name: string;
  adminName?: string;
  email: string;
  phone: string;
  address: string;
  governorate: string;
  directorate: string;
  educationLevel?: string;
  stage?: string;
  workingHours?: string;
  shift?: string;
  studyType?: string;
  genderType?: string;
  estimatedStudents?: string;
  approximateStudents?: string;
};

export type PendingAdminPackage = {
  id: string;
  name: string;
  price?: number;
  priceMonthly?: number;
  priceYearly?: number;
};

export type AdminSchoolDraft = {
  name?: string;
  adminName?: string;
  phone?: string;
  email?: string;
  address?: string;
  governorate?: string;
  directorate?: string;
  stage?: string;
  shift?: string;
  genderType?: string;
  estimatedStudents?: string;
};

export function isSchoolDraftComplete(draft: AdminSchoolDraft | null | undefined): boolean {
  if (!draft) return false;
  return Boolean(
    draft.phone?.trim() &&
      draft.address?.trim() &&
      draft.governorate?.trim() &&
      draft.directorate?.trim() &&
      draft.stage?.trim() &&
      draft.shift?.trim() &&
      draft.genderType?.trim() &&
      draft.estimatedStudents?.trim(),
  );
}

export function draftToCustomerInfo(
  draft: AdminSchoolDraft,
  user: User,
): AdminRegistrationCustomerInfo {
  const schoolName = draft.name?.trim() || draft.adminName?.trim() || user.displayName?.trim() || '';
  const adminName = draft.adminName?.trim() || user.displayName?.trim() || schoolName;
  return {
    name: schoolName,
    adminName,
    email: (draft.email || user.email || '').toLowerCase(),
    phone: draft.phone?.trim() || '',
    address: draft.address?.trim() || '',
    governorate: draft.governorate?.trim() || '',
    directorate: draft.directorate?.trim() || '',
    stage: draft.stage?.trim() || '',
    shift: draft.shift?.trim() || '',
    genderType: draft.genderType?.trim() || '',
    estimatedStudents: draft.estimatedStudents?.trim() || '',
  };
}

export function draftToSubscriptionForm(
  draft: AdminSchoolDraft,
  user?: User | null,
): {
  name: string;
  adminName: string;
  phone: string;
  email: string;
  address: string;
  governorate: string;
  directorate: string;
  stage: string;
  shift: string;
  genderType: string;
  estimatedStudents: string;
} {
  return {
    name: draft.name?.trim() || draft.adminName?.trim() || user?.displayName || '',
    adminName: draft.adminName?.trim() || user?.displayName || '',
    phone: draft.phone?.trim() || '',
    email: draft.email?.trim() || user?.email || '',
    address: draft.address?.trim() || '',
    governorate: draft.governorate?.trim() || '',
    directorate: draft.directorate?.trim() || '',
    stage: draft.stage?.trim() || '',
    shift: draft.shift?.trim() || '',
    genderType: draft.genderType?.trim() || '',
    estimatedStudents: draft.estimatedStudents?.trim() || '',
  };
}

function resolveAuthProvider(user: User): string {
  const providerId = user.providerData[0]?.providerId;
  if (providerId === 'google.com') return 'google';
  if (providerId === 'password') return 'password';
  return providerId || 'password';
}

function computePackagePrice(
  pkg: PendingAdminPackage,
  billingCycle: 'monthly' | 'annually',
): number {
  const isMonthly = billingCycle === 'monthly';
  if (isMonthly) {
    return pkg.priceMonthly !== undefined
      ? pkg.priceMonthly
      : Math.round((pkg.price || 0) / 12);
  }
  return pkg.priceYearly !== undefined ? pkg.priceYearly : pkg.price || 0;
}

/**
 * Create a pending subscription request and pending admin user profile.
 * Never creates a schools/{id} document.
 */
export async function submitPendingAdminSubscription(
  user: User,
  pkg: PendingAdminPackage,
  billingCycle: 'monthly' | 'annually',
  customerInfo: AdminRegistrationCustomerInfo,
): Promise<{ registrationId: string }> {
  const existingSnap = await withTimeout(
    getDoc(doc(db, 'users', user.uid)),
    8000,
    'registration/timeout',
  );
  if (existingSnap.exists()) {
    const existing = existingSnap.data();
    const isActiveAdmin =
      existing.role === 'admin' &&
      existing.schoolId &&
      existing.status !== 'pending' &&
      existing.subscriptionStatus !== 'pending';
    if (isActiveAdmin) {
      throw new AppError('Account is already active', {
        code: 'auth/account-active',
        source: 'auth',
      });
    }
  }

  const stage = customerInfo.stage || customerInfo.educationLevel || '';
  const shift = customerInfo.shift || customerInfo.workingHours || '';
  const genderType = customerInfo.genderType || customerInfo.studyType || '';
  const approximateStudents =
    customerInfo.approximateStudents ||
    customerInfo.estimatedStudents ||
    '';

  const customerInfoPayload = {
    ...customerInfo,
    name: customerInfo.name,
    adminName:
      customerInfo.adminName?.trim() ||
      user.displayName?.trim() ||
      customerInfo.name,
    email: (customerInfo.email || user.email || '').toLowerCase(),
    educationLevel: stage,
    stage,
    workingHours: shift,
    shift,
    studyType: genderType,
    genderType,
    estimatedStudents: approximateStudents,
    approximateStudents,
  };

  const isMonthly = billingCycle === 'monthly';
  const actualPrice = computePackagePrice(pkg, billingCycle);

  // Idempotent: one pending request per account. A retry (slow network, double tap, reload)
  // updates the same document instead of creating a duplicate. A previous request that was
  // already decided (rejected/approved) never gets overwritten — a new one is created.
  let regId = `reg_${user.uid}`;
  let subscriberCode = Math.floor(100000 + Math.random() * 900000).toString();
  let isUpdate = false;
  try {
    const prev = await withTimeout(getDoc(doc(db, 'registrations', regId)), 6000, 'registration/timeout');
    if (prev.exists()) {
      if (prev.data().status === 'pending') {
        isUpdate = true;
        subscriberCode = prev.data().subscriberCode || subscriberCode;
      } else {
        regId = `reg_${user.uid}_${Date.now().toString(36)}`;
      }
    }
  } catch (e: any) {
    // Not found / not readable → first request. A timeout here is surfaced by the commit below.
    if (e?.code === 'registration/timeout') throw e;
  }

  const regRef = doc(db, 'registrations', regId);
  const batch = writeBatch(db);
  batch.set(regRef, {
    type: 'subscription_request',
    status: 'pending',
    authProvider: resolveAuthProvider(user),
    uid: user.uid,
    email: user.email?.toLowerCase() || customerInfoPayload.email,
    customerInfo: customerInfoPayload,
    packageId: pkg.id,
    packageName: pkg.name,
    price: actualPrice,
    billingCycle,
    durationDays: isMonthly ? 30 : 365,
    governorate: customerInfo.governorate,
    directorate: customerInfo.directorate,
    stage,
    shift,
    genderType,
    approximateStudents,
    subscriberCode,
    ...(isUpdate ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp() }),
  }, { merge: true });
  batch.set(
    doc(db, 'users', user.uid),
    {
      uid: user.uid,
      name: customerInfoPayload.adminName,
      email: user.email?.toLowerCase() || customerInfoPayload.email,
      role: 'admin',
      status: 'pending',
      subscriptionStatus: 'pending',
      schoolId: '',
      pendingRegistrationId: regRef.id,
      phone: customerInfo.phone,
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  // Both writes are atomic. If the server does not confirm in time we tell the user to retry
  // (safe: same document ids) instead of leaving the screen loading forever.
  await withTimeout(batch.commit(), REGISTRATION_CONFIRM_TIMEOUT_MS, 'registration/timeout');

  return { registrationId: regRef.id };
}

export function isActiveSchoolAdmin(profile: {
  role?: string;
  schoolId?: string;
  status?: string;
  subscriptionStatus?: string;
  pendingRegistrationId?: string;
} | null): boolean {
  if (!profile || profile.role !== 'admin' || !profile.schoolId) return false;
  if (profile.status === 'active' || profile.subscriptionStatus === 'active') {
    return true;
  }
  // Backward compatible: approved linkage without pending registration pointer
  if (!profile.pendingRegistrationId && profile.schoolId) {
    return true;
  }
  return false;
}

export function isPendingSchoolAdmin(profile: {
  role?: string;
  schoolId?: string;
  status?: string;
  subscriptionStatus?: string;
  pendingRegistrationId?: string;
} | null): boolean {
  if (!profile || profile.role !== 'admin') return false;
  if (isActiveSchoolAdmin(profile)) return false;
  if (profile.status === 'pending' || profile.subscriptionStatus === 'pending') {
    return true;
  }
  if (profile.pendingRegistrationId) return true;
  return !profile.schoolId;
}
