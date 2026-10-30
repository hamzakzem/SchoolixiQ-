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
  // The server refuses a second active request (409) and notifies the
  // guards and the parents; a client-side duplicate check was refused by
  // the rules for parents and aborted the request.
  const result = await apiCreateDismissalRequest({
    schoolId: input.schoolId,
    studentId: input.studentId,
    parentName: input.parentName,
    requestedByName: input.requestedByName,
    pickupPersonName: input.pickupPersonName,
    pickupPersonRelation: input.pickupPersonRelation,
    pickupNote: input.pickupNote,
  });
  return { id: result.id, token: result.token };
}

/** Notifications for every step are written by the server (dismissalApi). */
export async function guardVerifyDismissal(
  requestId: string,
  _guard: { uid: string; name: string },
  note?: string,
) {
  await apiGuardVerifyDismissal(requestId, note);
}

export async function guardRejectDismissal(
  requestId: string,
  reason: string,
  _guard: { uid: string; name: string },
) {
  await apiGuardRejectDismissal(requestId, reason);
}

export async function managerApproveDismissal(
  requestId: string,
  _manager: { uid: string; name: string },
) {
  await apiManagerApproveDismissal(requestId);
}

export async function managerRejectDismissal(
  requestId: string,
  reason: string,
  _manager: { uid: string; name: string },
) {
  await apiManagerRejectDismissal(requestId, reason);
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
