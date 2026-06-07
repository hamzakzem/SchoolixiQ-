import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  deleteField,
  updateDoc,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

export type SchoolRegistrationRequest = {
  id: string;
  _source?: string;
  uid?: string;
  email?: string;
  type?: string;
  status?: string;
  schoolId?: string;
  name?: string;
  schoolName?: string;
  address?: string;
  planId?: string;
  packageId?: string;
  packageName?: string;
  password?: string;
  adminPassword?: string;
  adminPhone?: string;
  adminName?: string;
  phone?: string;
  governorate?: string;
  directorate?: string;
  educationLevel?: string;
  stage?: string;
  workingHours?: string;
  shift?: string;
  studyType?: string;
  genderType?: string;
  estimatedStudents?: string | number;
  approximateStudents?: string;
  durationDays?: number;
  customerInfo?: {
    email?: string;
    name?: string;
    adminName?: string;
    address?: string;
    phone?: string;
    password?: string;
    governorate?: string;
    directorate?: string;
    educationLevel?: string;
    stage?: string;
    workingHours?: string;
    shift?: string;
    studyType?: string;
    genderType?: string;
    estimatedStudents?: string | number;
    approximateStudents?: string;
  };
};

export function resolveRequestSource(request: SchoolRegistrationRequest): string {
  if (request._source) return request._source;
  if (request.type === 'direct_school_signup') return 'orders';
  return 'registrations';
}

export function resolveRequestEmail(request: SchoolRegistrationRequest): string {
  return (
    request.customerInfo?.email ||
    request.email ||
    ''
  )
    .toLowerCase()
    .trim();
}

/** Resolve Firebase Auth UID for the registering admin. */
export async function resolveAdminUidFromRequest(
  request: SchoolRegistrationRequest,
): Promise<string | null> {
  if (request.uid) return request.uid;

  const byPendingReg = await getDocs(
    query(
      collection(db, 'users'),
      where('pendingRegistrationId', '==', request.id),
    ),
  );
  if (!byPendingReg.empty) return byPendingReg.docs[0].id;

  const email = resolveRequestEmail(request);
  if (!email) return null;

  const byEmail = await getDocs(
    query(collection(db, 'users'), where('email', '==', email)),
  );
  if (!byEmail.empty) return byEmail.docs[0].id;

  return null;
}

function buildSchoolPayload(
  request: SchoolRegistrationRequest,
  schoolRef: ReturnType<typeof doc>,
  email: string,
  adminUid: string | null,
) {
  const customerInfo = request.customerInfo || {};
  const durationDays = request.durationDays || 365;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const name =
    customerInfo.name ||
    request.name ||
    request.schoolName ||
    'مدرسة جديدة';
  const planId =
    request.planId || request.packageId || request.packageName || 'basic';
  const password =
    request.password ||
    request.adminPassword ||
    customerInfo.password ||
    '';
  const phone =
    customerInfo.phone || request.phone || request.adminPhone || '';
  const adminName =
    customerInfo.adminName ||
    request.adminName ||
    request.name ||
    customerInfo.name ||
    'مدير المدرسة';

  return {
    schoolRef,
    payload: {
      name,
      address: customerInfo.address || request.address || '',
      governorate: customerInfo.governorate || request.governorate || '',
      directorate: customerInfo.directorate || request.directorate || '',
      educationLevel:
        customerInfo.educationLevel ||
        customerInfo.stage ||
        request.educationLevel ||
        request.stage ||
        '',
      stage:
        customerInfo.educationLevel ||
        customerInfo.stage ||
        request.educationLevel ||
        request.stage ||
        '',
      workingHours:
        customerInfo.workingHours ||
        customerInfo.shift ||
        request.workingHours ||
        request.shift ||
        '',
      shift:
        customerInfo.workingHours ||
        customerInfo.shift ||
        request.workingHours ||
        request.shift ||
        '',
      studyType:
        customerInfo.studyType ||
        customerInfo.genderType ||
        request.studyType ||
        request.genderType ||
        '',
      genderType:
        customerInfo.studyType ||
        customerInfo.genderType ||
        request.studyType ||
        request.genderType ||
        '',
      estimatedStudents:
        Number(
          customerInfo.estimatedStudents ||
            customerInfo.approximateStudents ||
            request.estimatedStudents,
        ) || 0,
      approximateStudents:
        customerInfo.estimatedStudents ||
        customerInfo.approximateStudents ||
        request.estimatedStudents ||
        '',
      status: 'active',
      planId,
      studentCount: 0,
      subscriptionExpiresAt: expiresAt.toISOString(),
      showSubscriptionTimer: true,
      adminEmail: email,
      adminPassword: password,
      adminPhone: phone,
      adminName,
      ownerUid: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    adminName,
    planId,
    expiresAt,
  };
}

function writeAdminActivation(
  batch: WriteBatch,
  adminUid: string,
  schoolId: string,
  email: string,
  adminName: string,
) {
  batch.set(
    doc(db, 'users', adminUid),
    {
      uid: adminUid,
      email,
      name: adminName,
      role: 'admin',
      status: 'active',
      subscriptionStatus: 'active',
      schoolId,
      pendingRegistrationId: deleteField(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function writeRegistrationApproved(
  batch: WriteBatch,
  source: string,
  requestId: string,
  schoolId: string,
) {
  batch.update(doc(db, source, requestId), {
    status: 'approved',
    schoolId,
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export type ActivationResult = {
  schoolId: string;
  adminUid: string | null;
  source: string;
};

/** Create school + activate admin + mark registration approved (atomic). */
export async function activateSchoolRegistration(
  request: SchoolRegistrationRequest,
): Promise<ActivationResult> {
  const source = resolveRequestSource(request);
  const email = resolveRequestEmail(request);
  const adminUid = await resolveAdminUidFromRequest(request);

  const schoolRef = doc(collection(db, 'schools'));
  const { payload, adminName } = buildSchoolPayload(
    request,
    schoolRef,
    email,
    adminUid,
  );

  const batch = writeBatch(db);
  batch.set(schoolRef, payload);

  if (adminUid) {
    writeAdminActivation(batch, adminUid, schoolRef.id, email, adminName);
  }

  writeRegistrationApproved(batch, source, request.id, schoolRef.id);
  await batch.commit();

  return { schoolId: schoolRef.id, adminUid, source };
}

/** Link admin to an existing active school (atomic). */
export async function activateExistingSchoolAdmin(
  request: SchoolRegistrationRequest,
  existingSchoolId: string,
): Promise<ActivationResult> {
  const source = resolveRequestSource(request);
  const email = resolveRequestEmail(request);
  const adminUid = await resolveAdminUidFromRequest(request);
  const durationDays = request.durationDays || 365;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  const planId =
    request.planId || request.packageId || request.packageName || 'basic';
  const adminName =
    request.customerInfo?.adminName ||
    request.adminName ||
    request.customerInfo?.name ||
    request.name ||
    'مدير المدرسة';

  const batch = writeBatch(db);
  batch.update(doc(db, 'schools', existingSchoolId), {
    status: 'active',
    planId,
    subscriptionExpiresAt: expiresAt.toISOString(),
    adminEmail: email || undefined,
    adminName,
    ownerUid: adminUid || undefined,
    updatedAt: serverTimestamp(),
  });

  if (adminUid) {
    writeAdminActivation(batch, adminUid, existingSchoolId, email, adminName);
  }

  writeRegistrationApproved(batch, source, request.id, existingSchoolId);
  await batch.commit();

  return { schoolId: existingSchoolId, adminUid, source };
}

/** Activate admin against a school that already exists on the request. */
export async function activateSubscriptionSchool(
  request: SchoolRegistrationRequest,
): Promise<ActivationResult> {
  if (!request.schoolId) {
    throw new Error('Request is not linked to a school');
  }

  const source = resolveRequestSource(request);
  const adminUid = await resolveAdminUidFromRequest(request);
  const durationDays = request.durationDays || 365;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const batch = writeBatch(db);
  batch.update(doc(db, 'schools', request.schoolId), {
    status: 'active',
    planId: request.planId || request.packageId || 'basic',
    subscriptionExpiresAt: expiresAt.toISOString(),
    updatedAt: serverTimestamp(),
  });

  if (adminUid) {
    const email = resolveRequestEmail(request);
    const adminName =
      request.customerInfo?.adminName ||
      request.adminName ||
      'مدير المدرسة';
    writeAdminActivation(batch, adminUid, request.schoolId, email, adminName);
  }

  writeRegistrationApproved(batch, source, request.id, request.schoolId);
  await batch.commit();

  return { schoolId: request.schoolId, adminUid, source };
}

/** Self-heal admin profile on login when school was approved but user doc is stale. */
export async function healAdminActivationOnLogin(
  email: string,
  uid: string,
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) return false;

  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return false;

  const userData = userSnap.data();
  if (userData.role !== 'admin') return false;

  const alreadyActive =
    userData.schoolId &&
    userData.status === 'active' &&
    userData.subscriptionStatus === 'active';
  if (alreadyActive) return false;

  let schoolId = userData.schoolId as string | undefined;

  if (schoolId) {
    const schoolSnap = await getDoc(doc(db, 'schools', schoolId));
    if (schoolSnap.exists() && schoolSnap.data().status === 'active') {
      await updateDoc(doc(db, 'users', uid), {
        status: 'active',
        subscriptionStatus: 'active',
        pendingRegistrationId: deleteField(),
        updatedAt: serverTimestamp(),
      });
      return true;
    }
  }

  const schoolQuery = await getDocs(
    query(
      collection(db, 'schools'),
      where('adminEmail', '==', normalizedEmail),
    ),
  );
  const activeSchool = schoolQuery.docs.find(
    (d) => d.data().status === 'active',
  );
  if (!activeSchool) return false;

  await updateDoc(doc(db, 'users', uid), {
    role: 'admin',
    status: 'active',
    subscriptionStatus: 'active',
    schoolId: activeSchool.id,
    pendingRegistrationId: deleteField(),
    updatedAt: serverTimestamp(),
  });
  return true;
}
