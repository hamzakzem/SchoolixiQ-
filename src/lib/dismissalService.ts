import { db } from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  limit,
  type Unsubscribe,
} from 'firebase/firestore';
import { notificationService } from './notificationService';
import {
  ACTIVE_DISMISSAL_STATUSES,
  GUARD_PENDING_STATUSES,
  MANAGER_QUEUE_STATUSES,
  DISMISSAL_NO_VALID_CLASS_MSG,
  coerceDismissalStatus,
  reconcileDismissalRequest,
  resolveDismissalStatus,
  type DismissalRequest,
} from './dismissalTypes';
import {
  apiCreateDismissalRequest,
  apiGuardVerifyDismissal,
  apiGuardRejectDismissal,
  apiManagerApproveDismissal,
  apiManagerRejectDismissal,
} from './dismissalApiClient';

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

export { DISMISSAL_NO_VALID_CLASS_MSG };

export async function resolveVerifiedStudentForDismissal(
  studentId: string,
  parentId: string,
  schoolId: string,
): Promise<VerifiedDismissalStudent> {
  const studentSnap = await getDoc(doc(db, 'students', studentId));
  if (!studentSnap.exists()) throw new Error('الطالب غير موجود');

  const data = studentSnap.data() as Record<string, unknown>;
  if (String(data.schoolId || '') !== schoolId) {
    throw new Error('الطالب لا ينتمي لهذه المدرسة');
  }

  const parentIds = Array.isArray(data.parentIds)
    ? (data.parentIds as string[]).filter(Boolean)
    : [];
  if (!parentIds.includes(parentId)) {
    throw new Error('غير مسموح لك بإنشاء طلب لهذا الطالب');
  }

  const classId = String(data.classId || '').trim();
  if (!classId) throw new Error(DISMISSAL_NO_VALID_CLASS_MSG);

  const classSnap = await getDoc(doc(db, 'classes', classId));
  if (!classSnap.exists() || String(classSnap.data()?.schoolId || '') !== schoolId) {
    throw new Error(DISMISSAL_NO_VALID_CLASS_MSG);
  }

  const className = String(classSnap.data()?.name || '').trim();
  if (!className) throw new Error(DISMISSAL_NO_VALID_CLASS_MSG);

  const studentName = String(data.name || '').trim();
  if (!studentName) throw new Error('بيانات الطالب غير مكتملة');

  return {
    studentId,
    studentName,
    classId,
    className,
    schoolId,
    registrationNumber: String(data.registrationNumber || ''),
    photoUrl: String(data.photoUrl || data.photo || ''),
    parentIds,
  };
}

export const DISMISSAL_COLLECTION = 'dismissal_requests';

function toMillis(ts?: { seconds: number; nanoseconds?: number } | null): number {
  if (!ts?.seconds) return 0;
  return ts.seconds * 1000;
}

export function isDismissalTokenExpired(
  request: Pick<DismissalRequest, 'tokenExpiresAt' | 'status'>,
): boolean {
  if (request.status === 'EXPIRED') return true;
  const expiresAt = toMillis(request.tokenExpiresAt);
  return expiresAt > 0 && Date.now() > expiresAt;
}

export function normalizeDismissalDoc(
  id: string,
  data: Record<string, unknown>,
): DismissalRequest {
  const raw = { id, ...data } as DismissalRequest;
  let req = reconcileDismissalRequest(raw);
  const resolved = resolveDismissalStatus(req);
  req = { ...req, status: resolved, derivedStatus: resolved };
  if (isDismissalTokenExpired(req) && ACTIVE_DISMISSAL_STATUSES.includes(resolved)) {
    req = { ...req, status: 'EXPIRED', derivedStatus: 'EXPIRED' };
  }
  return req;
}

async function notifySchoolGuards(
  schoolId: string,
  payload: Omit<Parameters<typeof notificationService.sendToMultiple>[1], 'schoolId' | 'type'>,
) {
  const q = query(
    collection(db, 'users'),
    where('schoolId', '==', schoolId),
    where('role', '==', 'guard'),
    limit(50),
  );
  const snap = await getDocs(q);
  const ids = snap.docs.map((d) => d.id);
  if (!ids.length) return;
  await notificationService.sendToMultiple(ids, {
    ...payload,
    schoolId,
    type: 'smart_gate',
    metadata: { ...(payload.metadata || {}), routeTarget: 'smart_gate' },
  });
}

async function notifySchoolManagers(
  schoolId: string,
  payload: Omit<Parameters<typeof notificationService.sendToMultiple>[1], 'schoolId' | 'type'>,
) {
  const q = query(
    collection(db, 'users'),
    where('schoolId', '==', schoolId),
    where('role', 'in', ['admin', 'school_admin', 'assistant']),
    limit(50),
  );
  const snap = await getDocs(q);
  const ids = snap.docs.map((d) => d.id);
  if (!ids.length) return;
  await notificationService.sendToMultiple(ids, {
    ...payload,
    schoolId,
    type: 'smart_gate',
    metadata: { ...(payload.metadata || {}), routeTarget: 'dismissal_gate' },
  });
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
    .find((r) => ACTIVE_DISMISSAL_STATUSES.includes(resolveDismissalStatus(r)));
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
  await resolveVerifiedStudentForDismissal(input.studentId, input.parentId, input.schoolId);
  const existing = await findActiveDismissalForStudent(input.studentId, input.schoolId);
  if (existing) throw new Error('يوجد طلب تسريح نشط لهذا الطالب بالفعل');

  const result = await apiCreateDismissalRequest({
    schoolId: input.schoolId,
    studentId: input.studentId,
    parentName: input.parentName,
    requestedByName: input.requestedByName,
    pickupPersonName: input.pickupPersonName,
    pickupPersonRelation: input.pickupPersonRelation,
    pickupNote: input.pickupNote,
  });

  const verified = await resolveVerifiedStudentForDismissal(
    input.studentId,
    input.parentId,
    input.schoolId,
  );
  const title = 'طلب تسريح جديد';
  const message = `${verified.studentName} — بانتظار مراجعة الحارس`;
  const meta = {
    sourceId: result.id,
    dismissalId: result.id,
    studentId: verified.studentId,
    classId: verified.classId,
  };

  await Promise.all([
    notifySchoolGuards(input.schoolId, { title, message, metadata: meta }),
    notificationService.notifyStudentParents(verified.studentId, {
      title: 'تم استلام طلب التسريح',
      message: 'طلبك قيد مراجعة الحارس',
      schoolId: input.schoolId,
      type: 'smart_gate',
      metadata: { ...meta, routeTarget: 'dismissal' },
    }),
  ]);

  return { id: result.id, token: result.token };
}

export async function guardVerifyDismissal(
  requestId: string,
  guard: { uid: string; name: string },
  note?: string,
) {
  await apiGuardVerifyDismissal(requestId, note);

  const snap = await getDoc(doc(db, DISMISSAL_COLLECTION, requestId));
  const data = snap.data() as Record<string, unknown> | undefined;
  if (!data) return;

  const schoolId = String(data.schoolId || '');
  const studentName = String(data.studentName || '');
  const title = 'طلب جاهز لاعتماد الإدارة';
  const message = `${studentName} — تحقق الحارس (${guard.name})`;

  await Promise.all([
    notifySchoolManagers(schoolId, {
      title,
      message,
      metadata: { sourceId: requestId, dismissalId: requestId },
    }),
    notificationService.notifyStudentParents(String(data.studentId || ''), {
      title: 'تحقق الحارس',
      message: 'طلب التسريح بانتظار اعتماد الإدارة',
      schoolId,
      type: 'smart_gate',
      metadata: { sourceId: requestId, dismissalId: requestId, routeTarget: 'dismissal' },
    }),
  ]);
}

export async function guardRejectDismissal(
  requestId: string,
  reason: string,
  guard: { uid: string; name: string },
) {
  await apiGuardRejectDismissal(requestId, reason);

  const snap = await getDoc(doc(db, DISMISSAL_COLLECTION, requestId));
  const data = snap.data();
  if (!data) return;

  await notificationService.notifyStudentParents(String(data.studentId || ''), {
    title: 'رفض طلب التسريح',
    message: reason || 'تم رفض الطلب من الحارس',
    schoolId: String(data.schoolId || ''),
    type: 'smart_gate',
    metadata: { sourceId: requestId, dismissalId: requestId, routeTarget: 'dismissal' },
  });
}

export async function managerApproveDismissal(
  requestId: string,
  manager: { uid: string; name: string },
) {
  await apiManagerApproveDismissal(requestId);

  const snap = await getDoc(doc(db, DISMISSAL_COLLECTION, requestId));
  const data = snap.data();
  if (!data) return;

  await notificationService.notifyStudentParents(String(data.studentId || ''), {
    title: 'تم التسريح',
    message: `تم اعتماد تسريح ${data.studentName} — يمكنك استلام الطالب`,
    schoolId: String(data.schoolId || ''),
    type: 'system',
    metadata: { sourceId: requestId, dismissalId: requestId, routeTarget: 'dismissal' },
  });
}

export async function managerRejectDismissal(
  requestId: string,
  reason: string,
  manager: { uid: string; name: string },
) {
  await apiManagerRejectDismissal(requestId, reason);

  const snap = await getDoc(doc(db, DISMISSAL_COLLECTION, requestId));
  const data = snap.data();
  if (!data) return;

  await notificationService.notifyStudentParents(String(data.studentId || ''), {
    title: 'رفض التسريح من الإدارة',
    message: reason || 'تم رفض الطلب من الإدارة',
    schoolId: String(data.schoolId || ''),
    type: 'smart_gate',
    metadata: { sourceId: requestId, dismissalId: requestId, routeTarget: 'dismissal' },
  });
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

export function filterPendingForGuard(requests: DismissalRequest[]) {
  return requests.filter(
    (r) => GUARD_PENDING_STATUSES.includes(resolveDismissalStatus(r)) && !r.isProcessing,
  );
}

export function filterVerifiedForManager(requests: DismissalRequest[]) {
  return requests.filter(
    (r) => MANAGER_QUEUE_STATUSES.includes(resolveDismissalStatus(r)) && !r.isProcessing,
  );
}
