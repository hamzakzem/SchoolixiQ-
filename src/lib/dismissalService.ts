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
  type DismissalRequest,
  type DismissalStatus,
  type DismissalStatusEvent,
} from './dismissalTypes';

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
) {
  const ref = doc(db, DISMISSAL_COLLECTION, requestId);
  const snap = await getDoc(ref);
  const existing = snap.data()?.statusHistory as DismissalStatusEvent[] | undefined;
  const history = [...(existing || []), { ...entry, at: null }];
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
  studentName: string;
  classId: string;
  className: string;
  parentId: string;
  parentName: string;
  requestedByName: string;
  pickupPersonName?: string;
  pickupPersonRelation?: string;
  pickupNote?: string;
}): Promise<{ id: string; token: string }> {
  const existing = await findActiveDismissalForStudent(input.studentId, input.schoolId);
  if (existing) {
    throw new Error('يوجد طلب تسريح نشط لهذا الطالب بالفعل');
  }

  const token = generateToken().toUpperCase();
  const expiresAt = Timestamp.fromMillis(Date.now() + TOKEN_TTL_MS);
  const docRef = await addDoc(collection(db, DISMISSAL_COLLECTION), {
    ...input,
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
      },
    ],
  });

  const title = 'طلب تسريح من البوابة';
  const message = `${input.studentName} — ولي الأمر عند البوابة`;
  const meta = { sourceId: docRef.id, dismissalId: docRef.id, studentId: input.studentId };

  await Promise.all([
    notifyClassTeachers(input.schoolId, input.classId, {
      title,
      message,
      metadata: meta,
    }),
    notifySchoolGuards(input.schoolId, {
      title,
      message,
      metadata: meta,
    }),
    notifySchoolAdmins(input.schoolId, {
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
) {
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
  await appendStatusHistory(requestId, {
    status,
    by: teacher.uid,
    byName: teacher.name,
  });

  const snap = await getDoc(doc(db, DISMISSAL_COLLECTION, requestId));
  const data = snap.data();
  if (!data) return;

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

export async function guardCompleteDismissal(
  request: DismissalRequest,
  guard: { uid: string; name: string },
) {
  if (isDismissalTokenExpired(request)) {
    throw new Error('انتهت صلاحية الرمز');
  }
  if (!['called', 'ready'].includes(request.status)) {
    throw new Error('الطلب غير جاهز للتسليم');
  }
  if (request.tokenExpiresAt && isDismissalTokenExpired(request)) {
    throw new Error('انتهت صلاحية الرمز');
  }

  await updateDoc(doc(db, DISMISSAL_COLLECTION, request.id), {
    status: 'completed',
    completedAt: serverTimestamp(),
    completedByGuardId: guard.uid,
    completedByGuardName: guard.name,
    updatedAt: serverTimestamp(),
  });
  await appendStatusHistory(request.id, {
    status: 'completed',
    by: guard.uid,
    byName: guard.name,
  });

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
  await appendStatusHistory(requestId, {
    status: 'cancelled',
    by: guard.uid,
    byName: guard.name,
    note: reason,
  });
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
  if (!['called', 'ready', 'waiting'].includes(request.status)) {
    throw new Error('الطلب غير نشط');
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
