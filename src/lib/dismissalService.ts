import { db } from './firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  limit,
  type Unsubscribe,
} from 'firebase/firestore';
import { notificationService } from './notificationService';
import {
  ACTIVE_DISMISSAL_STATUSES,
  DISMISSAL_NO_VALID_CLASS_MSG,
  type DismissalRequest,
  type DismissalStatus,
  type DismissalStatusEvent,
} from './dismissalTypes';

export type VerifiedDismissalStudent = {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  schoolId: string;
  registrationNumber: string;
  photoUrl: string;
  parentIds: string[];
};

export async function resolveVerifiedStudentForDismissal(
  studentId: string,
  parentId: string,
  schoolId: string,
): Promise<VerifiedDismissalStudent> {
  const studentSnap = await getDoc(doc(db, 'students', studentId));
  if (!studentSnap.exists()) {
    throw new Error('الطالب غير موجود');
  }

  const data = studentSnap.data() as Record<string, unknown>;
  const studentSchoolId = String(data.schoolId || '');
  if (!studentSchoolId || studentSchoolId !== schoolId) {
    throw new Error('الطالب لا ينتمي لهذه المدرسة');
  }

  const parentIds = Array.isArray(data.parentIds)
    ? (data.parentIds as string[]).filter(Boolean)
    : [];
  if (!parentIds.includes(parentId)) {
    throw new Error('غير مسموح لك بإنشاء طلب لهذا الطالب');
  }

  const classId = String(data.classId || '').trim();
  if (!classId) {
    throw new Error(DISMISSAL_NO_VALID_CLASS_MSG);
  }

  const classSnap = await getDoc(doc(db, 'classes', classId));
  if (!classSnap.exists()) {
    throw new Error(DISMISSAL_NO_VALID_CLASS_MSG);
  }

  const classData = classSnap.data() as Record<string, unknown>;
  if (String(classData.schoolId || '') !== schoolId) {
    throw new Error(DISMISSAL_NO_VALID_CLASS_MSG);
  }

  const className = String(classData.name || '').trim();
  if (!className) {
    throw new Error(DISMISSAL_NO_VALID_CLASS_MSG);
  }

  const studentName = String(data.name || '').trim();
  if (!studentName) {
    throw new Error('بيانات الطالب غير مكتملة');
  }

  return {
    studentId,
    studentName,
    classId,
    className,
    schoolId: studentSchoolId,
    registrationNumber: String(data.registrationNumber || ''),
    photoUrl: String(data.photoUrl || data.photo || ''),
    parentIds,
  };
}

export const DISMISSAL_COLLECTION = 'dismissal_requests';
const TOKEN_TTL_MS = 10 * 60 * 1000;

function generateToken(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part()}-${part()}`;
}

function toMillis(ts?: { seconds: number; nanoseconds?: number } | null): number {
  if (!ts?.seconds) return 0;
  return ts.seconds * 1000;
}

export function isDismissalTokenExpired(
  request: Pick<DismissalRequest, 'tokenExpiresAt' | 'status'>,
): boolean {
  if (request.status === 'expired') return true;
  const expiresAt = toMillis(request.tokenExpiresAt);
  return expiresAt > 0 && Date.now() > expiresAt;
}

export function normalizeDismissalDoc(
  id: string,
  data: Record<string, unknown>,
): DismissalRequest {
  const req = { id, ...data } as DismissalRequest;
  if (isDismissalTokenExpired(req) && ACTIVE_DISMISSAL_STATUSES.includes(req.status)) {
    return { ...req, status: 'expired' };
  }
  return req;
}

async function appendStatusHistory(
  requestId: string,
  entry: Omit<DismissalStatusEvent, 'at'>,
  context?: { studentId?: string; classId?: string },
) {
  const ref = doc(db, DISMISSAL_COLLECTION, requestId);
  const snap = await getDoc(ref);
  const existing = snap.data()?.statusHistory as DismissalStatusEvent[] | undefined;
  const history = [
    ...(existing || []),
    {
      ...entry,
      studentId: entry.studentId || context?.studentId,
      classId: entry.classId || context?.classId,
      at: null,
    },
  ];
  await updateDoc(ref, {
    statusHistory: history,
    updatedAt: serverTimestamp(),
  });
}

async function notifySchoolGuards(
  schoolId: string,
  payload: Omit<Parameters<typeof notificationService.sendToMultiple>[1], 'schoolId'>,
) {
  const q = query(
    collection(db, 'users'),
    where('schoolId', '==', schoolId),
    where('role', '==', 'guard'),
    limit(50),
  );
  const snap = await getDocs(q);
  const ids = snap.docs.map((d) => d.id);
  if (ids.length === 0) return;
  await notificationService.sendToMultiple(ids, { ...payload, schoolId, type: 'system' });
}

async function notifyClassTeachers(
  schoolId: string,
  classId: string,
  payload: Omit<Parameters<typeof notificationService.sendToMultiple>[1], 'schoolId'>,
) {
  const q = query(
    collection(db, 'users'),
    where('schoolId', '==', schoolId),
    where('role', '==', 'teacher'),
    limit(100,
    ),
  );
  const snap = await getDocs(q);
  const ids = snap.docs
    .filter((d) => {
      const data = d.data();
      const assigned =
        data.assignedClassId || data.primaryClassId || data.classId || data.preferredClassId;
      return assigned === classId;
    })
    .map((d) => d.id);
  if (ids.length === 0) return;
  await notificationService.sendToMultiple(ids, { ...payload, schoolId, type: 'system' });
}

async function notifySchoolAdmins(
  schoolId: string,
  payload: Omit<Parameters<typeof notificationService.sendToMultiple>[1], 'schoolId'>,
) {
  const q = query(
    collection(db, 'users'),
    where('schoolId', '==', schoolId),
    where('role', 'in', ['admin', 'school_admin', 'assistant']),
    limit(50,
    ),
  );
  const snap = await getDocs(q);
  const ids = snap.docs.map((d) => d.id);
  if (ids.length === 0) return;
  await notificationService.sendToMultiple(ids, { ...payload, schoolId, type: 'system' });
}

export async function findActiveDismissalForStudent(
  studentId: string,
  schoolId: string,
): Promise<DismissalRequest | null> {
  const q = query(
    collection(db, DISMISSAL_COLLECTION),
    where('schoolId', '==', schoolId),
    where('studentId', '==', studentId),
    limit(20),
  );
  const snap = await getDocs(q);
  const active = snap.docs
    .map((d) => normalizeDismissalDoc(d.id, d.data() as Record<string, unknown>))
    .find((r) => ACTIVE_DISMISSAL_STATUSES.includes(r.status));
  return active || null;
}

export async function createDismissalRequest(input: {
  schoolId: string;
  studentId: string;
  parentId: string;
  parentName: string;
  requestedByName: string;
  pickupPersonName?: string;
  pickupPersonRelation?: string;
  pickupNote?: string;
}): Promise<{ id: string; token: string }> {
  const verified = await resolveVerifiedStudentForDismissal(
    input.studentId,
    input.parentId,
    input.schoolId,
  );

  const existing = await findActiveDismissalForStudent(verified.studentId, verified.schoolId);
  if (existing) {
    throw new Error('يوجد طلب تسريح نشط لهذا الطالب بالفعل');
  }

  const token = generateToken().toUpperCase();
  const expiresAt = Timestamp.fromMillis(Date.now() + TOKEN_TTL_MS);
  const docRef = await addDoc(collection(db, DISMISSAL_COLLECTION), {
    schoolId: verified.schoolId,
    studentId: verified.studentId,
    studentName: verified.studentName,
    classId: verified.classId,
    className: verified.className,
    registrationNumber: verified.registrationNumber,
    photoUrl: verified.photoUrl,
    parentIds: verified.parentIds,
    parentId: input.parentId,
    parentName: input.parentName,
    requestedByName: input.requestedByName,
    pickupPersonName: input.pickupPersonName?.trim() || input.parentName,
    pickupPersonRelation: input.pickupPersonRelation?.trim() || 'ولي أمر',
    pickupNote: input.pickupNote?.trim() || '',
    status: 'waiting' as DismissalStatus,
    token,
    tokenExpiresAt: expiresAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    statusHistory: [
      {
        status: 'waiting',
        at: null,
        by: input.parentId,
        byName: input.requestedByName,
        studentId: verified.studentId,
        classId: verified.classId,
      },
    ],
  });

  const title = 'طلب تسريح من البوابة';
  const message = `${verified.studentName} — ${verified.className} — ولي الأمر عند البوابة`;
  const meta = {
    sourceId: docRef.id,
    dismissalId: docRef.id,
    studentId: verified.studentId,
    classId: verified.classId,
  };

  await Promise.all([
    notifyClassTeachers(verified.schoolId, verified.classId, {
      title,
      message,
      metadata: meta,
    }),
    notifySchoolGuards(verified.schoolId, {
      title,
      message,
      metadata: meta,
    }),
    notifySchoolAdmins(verified.schoolId, {
      title,
      message,
      metadata: meta,
    }),
  ]);

  return { id: docRef.id, token };
}

export async function teacherUpdateDismissalStatus(
  requestId: string,
  status: 'called' | 'ready',
  teacher: { uid: string; name: string },
  assignedClassId: string,
) {
  if (!assignedClassId) {
    throw new Error('لم يتم تعيين صف لهذا المعلم بعد');
  }

  const existingSnap = await getDoc(doc(db, DISMISSAL_COLLECTION, requestId));
  const existing = existingSnap.data();
  if (!existing) {
    throw new Error('الطلب غير موجود');
  }
  if (String(existing.classId || '') !== assignedClassId) {
    throw new Error('لا يمكنك تحديث طلب لصف آخر');
  }
  if (!ACTIVE_DISMISSAL_STATUSES.includes(existing.status as DismissalStatus)) {
    throw new Error('الطلب غير نشط');
  }

  const fields: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (status === 'called') {
    fields.calledAt = serverTimestamp();
    fields.calledByTeacherId = teacher.uid;
    fields.calledByTeacherName = teacher.name;
  } else {
    fields.readyAt = serverTimestamp();
    fields.readyByTeacherId = teacher.uid;
    fields.readyByTeacherName = teacher.name;
  }

  await updateDoc(doc(db, DISMISSAL_COLLECTION, requestId), fields);
  await appendStatusHistory(
    requestId,
    {
      status,
      by: teacher.uid,
      byName: teacher.name,
    },
    {
      studentId: String(existing.studentId || ''),
      classId: String(existing.classId || ''),
    },
  );

  const data = existing;
  const schoolId = String(data.schoolId || '');
  const studentId = String(data.studentId || '');
  const studentName = String(data.studentName || '');
  const title =
    status === 'called' ? 'تم نداء الطالب' : 'الطالب جاهز للتسليم';
  const message =
    status === 'called'
      ? `${studentName} — تم النداء من الصف`
      : `${studentName} — جاهز عند البوابة`;

  await Promise.all([
    notifySchoolGuards(schoolId, {
      title,
      message,
      metadata: { sourceId: requestId, dismissalId: requestId },
    }),
    notificationService.notifyStudentParents(studentId, {
      title,
      message,
      schoolId,
      type: 'system',
      metadata: { sourceId: requestId, dismissalId: requestId },
    }),
  ]);
}

export async function verifyDismissalHandover(
  request: DismissalRequest,
  guardSchoolId: string,
  tokenInput: string,
): Promise<DismissalRequest> {
  const normalizedToken = tokenInput.trim().toUpperCase();
  if (request.schoolId !== guardSchoolId) {
    throw new Error('رمز لا يخص هذه المدرسة');
  }
  if (request.token.toUpperCase() !== normalizedToken) {
    throw new Error('رمز التحقق غير متطابق');
  }
  if (isDismissalTokenExpired(request)) {
    throw new Error('انتهت صلاحية الرمز');
  }
  if (!['called', 'ready'].includes(request.status)) {
    throw new Error('الطلب غير جاهز للتسليم');
  }

  const studentSnap = await getDoc(doc(db, 'students', request.studentId));
  if (!studentSnap.exists()) {
    throw new Error('تعذر التحقق من بيانات الطالب');
  }
  const studentData = studentSnap.data() as Record<string, unknown>;
  if (String(studentData.schoolId || '') !== guardSchoolId) {
    throw new Error('الطالب لا ينتمي لهذه المدرسة');
  }
  if (String(studentData.classId || '') !== request.classId) {
    throw new Error('بيانات الصف لا تطابق سجل الطالب');
  }

  const classSnap = await getDoc(doc(db, 'classes', request.classId));
  if (!classSnap.exists() || String(classSnap.data()?.schoolId || '') !== guardSchoolId) {
    throw new Error('الصف غير صالح في هذه المدرسة');
  }

  return request;
}

export async function guardCompleteDismissal(
  request: DismissalRequest,
  guard: { uid: string; name: string },
  tokenInput: string,
) {
  await verifyDismissalHandover(request, request.schoolId, tokenInput);

  await updateDoc(doc(db, DISMISSAL_COLLECTION, request.id), {
    status: 'completed',
    completedAt: serverTimestamp(),
    completedByGuardId: guard.uid,
    completedByGuardName: guard.name,
    updatedAt: serverTimestamp(),
  });
  await appendStatusHistory(
    request.id,
    {
      status: 'completed',
      by: guard.uid,
      byName: guard.name,
    },
    { studentId: request.studentId, classId: request.classId },
  );

  await Promise.all([
    notificationService.notifyStudentParents(request.studentId, {
      title: 'تم تسليم الطالب',
      message: `تم تسليم ${request.studentName} بنجاح من البوابة`,
      schoolId: request.schoolId,
      type: 'system',
      metadata: { sourceId: request.id, dismissalId: request.id },
    }),
    notifySchoolAdmins(request.schoolId, {
      title: 'تسليم مكتمل',
      message: `${request.studentName} — ${guard.name}`,
      metadata: { sourceId: request.id, dismissalId: request.id },
    }),
  ]);
}

export async function guardCancelDismissal(
  requestId: string,
  reason: string,
  guard: { uid: string; name: string },
) {
  await updateDoc(doc(db, DISMISSAL_COLLECTION, requestId), {
    status: 'cancelled',
    cancelReason: reason,
    cancelledAt: serverTimestamp(),
    cancelledByGuardId: guard.uid,
    cancelledByGuardName: guard.name,
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(doc(db, DISMISSAL_COLLECTION, requestId));
  const data = snap.data();
  await appendStatusHistory(
    requestId,
    {
      status: 'cancelled',
      by: guard.uid,
      byName: guard.name,
      note: reason,
    },
    {
      studentId: String(data?.studentId || ''),
      classId: String(data?.classId || ''),
    },
  );
}

export function groupDismissalsByClass(
  requests: DismissalRequest[],
): Record<string, DismissalRequest[]> {
  return requests.reduce<Record<string, DismissalRequest[]>>((acc, request) => {
    const key = request.classId || request.className || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(request);
    return acc;
  }, {});
}

export async function verifyDismissalToken(
  token: string,
  guardSchoolId: string,
): Promise<DismissalRequest> {
  const normalized = token.trim().toUpperCase();
  const q = query(
    collection(db, DISMISSAL_COLLECTION),
    where('schoolId', '==', guardSchoolId),
    limit(100),
  );
  const snap = await getDocs(q);
  const docSnap = snap.docs.find(
    (d) => String(d.data().token || '').toUpperCase() === normalized,
  );
  if (!docSnap) {
    throw new Error('رمز غير صالح');
  }
  const request = normalizeDismissalDoc(docSnap.id, docSnap.data() as Record<string, unknown>);
  if (request.schoolId !== guardSchoolId) {
    throw new Error('رمز لا يخص هذه المدرسة');
  }
  if (isDismissalTokenExpired(request)) {
    throw new Error('انتهت صلاحية الرمز');
  }
  if (!ACTIVE_DISMISSAL_STATUSES.includes(request.status)) {
    throw new Error('الطلب غير نشط');
  }

  const studentSnap = await getDoc(doc(db, 'students', request.studentId));
  if (!studentSnap.exists()) {
    throw new Error('تعذر التحقق من بيانات الطالب');
  }
  const studentData = studentSnap.data() as Record<string, unknown>;
  if (String(studentData.classId || '') !== request.classId) {
    throw new Error('بيانات الصف لا تطابق سجل الطالب');
  }

  return request;
}

export function subscribeSchoolDismissals(
  schoolId: string,
  onData: (requests: DismissalRequest[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(db, DISMISSAL_COLLECTION),
    where('schoolId', '==', schoolId),
    limit(200),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => normalizeDismissalDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      onData(rows);
    },
    (err) => onError?.(err),
  );
}

export function subscribeParentDismissals(
  parentId: string,
  schoolId: string,
  onData: (requests: DismissalRequest[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, DISMISSAL_COLLECTION),
    where('schoolId', '==', schoolId),
    where('parentId', '==', parentId),
    limit(50),
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => normalizeDismissalDoc(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    onData(rows);
  });
}
