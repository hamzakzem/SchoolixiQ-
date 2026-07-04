import {
  STATES,
  EVENT_TYPES,
  ACTIVE_STATES,
  GUARD_QUEUE,
  MANAGER_QUEUE,
  deriveState,
  makeEvent,
  appendEvents,
  assertCanAcquireLock,
  assertTransition,
  assertIdempotent,
  hasEventId,
  duplicateEventError,
  TRANSITIONS,
} from './dismissalStateMachine.mjs';
import {
  buildSnapshot,
  resolveEffectiveState,
  detectDrift,
  materializeFromEvents,
  writeSnapshotDoc,
} from './dismissalSnapshot.mjs';

const DISMISSAL_COL = 'dismissal_requests';
const DISMISSAL_LOGS_COL = 'dismissal_logs';
const TOKEN_TTL_MS = 10 * 60 * 1000;

const MANAGER_ROLES = new Set([
  'admin',
  'school_admin',
  'assistant',
  'superadmin',
  'super_admin',
]);

function httpError(message, code, status = 400) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

function generateToken() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part()}-${part()}`;
}

async function loadUser(db, uid) {
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) throw httpError('المستخدم غير موجود', 'USER_NOT_FOUND', 403);
  return { uid, ...snap.data() };
}

function assertRole(user, roles, message) {
  if (!roles.has(String(user.role || ''))) {
    throw httpError(message || 'غير مصرح', 'FORBIDDEN_ROLE', 403);
  }
}

function assertSchool(user, schoolId) {
  const isSuper = ['superadmin', 'super_admin'].includes(String(user.role || ''));
  if (!isSuper && String(user.schoolId || '') !== schoolId) {
    throw httpError('لا يمكنك الوصول لمدرسة أخرى', 'FORBIDDEN_SCHOOL', 403);
  }
}

async function resolveStudent(db, studentId, parentId, schoolId) {
  const snap = await db.collection('students').doc(studentId).get();
  if (!snap.exists) throw httpError('الطالب غير موجود', 'STUDENT_NOT_FOUND', 404);
  const data = snap.data() || {};
  if (String(data.schoolId || '') !== schoolId) {
    throw httpError('الطالب لا ينتمي لهذه المدرسة', 'INVALID_SCHOOL', 400);
  }
  const parentIds = Array.isArray(data.parentIds) ? data.parentIds.filter(Boolean) : [];
  if (!parentIds.includes(parentId)) {
    throw httpError('غير مسموح لك بإنشاء طلب لهذا الطالب', 'FORBIDDEN_PARENT', 403);
  }
  const classId = String(data.classId || '').trim();
  if (!classId) throw httpError('لا يمكن إنشاء طلب تسريح لأن الطالب غير مرتبط بصف صحيح', 'NO_CLASS', 400);

  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists || String(classSnap.data()?.schoolId || '') !== schoolId) {
    throw httpError('لا يمكن إنشاء طلب تسريح لأن الطالب غير مرتبط بصف صحيح', 'NO_CLASS', 400);
  }
  const className = String(classSnap.data()?.name || '').trim();
  if (!className) throw httpError('لا يمكن إنشاء طلب تسريح لأن الطالب غير مرتبط بصف صحيح', 'NO_CLASS', 400);

  return {
    studentId,
    studentName: String(data.name || '').trim(),
    classId,
    className,
    schoolId,
    registrationNumber: String(data.registrationNumber || ''),
    photoUrl: String(data.photoUrl || data.photo || ''),
    parentIds,
  };
}

async function findActiveForStudent(db, studentId, schoolId) {
  const snap = await db
    .collection(DISMISSAL_COL)
    .where('schoolId', '==', schoolId)
    .where('studentId', '==', studentId)
    .limit(20)
    .get();
  return (
    snap.docs.find((d) => {
      const state = resolveEffectiveState(d.data());
      return ACTIVE_STATES.includes(state);
    }) || null
  );
}

async function getRequestOrThrow(db, requestId) {
  const ref = db.collection(DISMISSAL_COL).doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) throw httpError('الطلب غير موجود', 'NOT_FOUND', 404);
  return { ref, data: snap.data(), id: snap.id };
}

async function verifyStudentMatch(db, data, schoolId) {
  const studentSnap = await db.collection('students').doc(String(data.studentId)).get();
  if (!studentSnap.exists) throw httpError('تعذر التحقق من بيانات الطالب', 'STUDENT_NOT_FOUND', 400);
  const student = studentSnap.data() || {};
  if (String(student.schoolId || '') !== schoolId) {
    throw httpError('الطالب لا ينتمي لهذه المدرسة', 'INVALID_SCHOOL', 400);
  }
  if (String(student.classId || '') !== String(data.classId || '')) {
    throw httpError('بيانات الصف لا تطابق سجل الطالب', 'CLASS_MISMATCH', 400);
  }
}

function runTransitionTx(tx, ref, requestId, freshData, uid, actorName, config, extra = {}) {
  const events = Array.isArray(freshData.dismissalEvents) ? freshData.dismissalEvents : [];
  const current = resolveEffectiveState(freshData);
  const idempotencyKey = extra.idempotencyKey || `${config.eventType}:${uid}`;

  const primaryEvent = makeEvent(requestId, config.eventType, uid, {
    byName: actorName,
    idempotencyKey,
    ...extra.metadata,
  });

  if (hasEventId(events, primaryEvent.eventId)) {
    throw duplicateEventError();
  }

  assertCanAcquireLock(freshData, uid);
  assertTransition(current, config.targetState, config.allowedFrom);
  assertIdempotent(events, config.eventType, config.targetState, current, primaryEvent.eventId);

  const now = new Date();
  let nextEvents = appendEvents(events, primaryEvent);

  if (config.alsoEvents) {
    for (const t of config.alsoEvents) {
      const alsoEv = makeEvent(requestId, t, uid, {
        byName: actorName,
        idempotencyKey: `${idempotencyKey}:${t}`,
        ...extra.metadata,
      });
      if (hasEventId(nextEvents, alsoEv.eventId)) {
        throw duplicateEventError();
      }
      nextEvents = appendEvents(nextEvents, alsoEv);
    }
  }

  const patch = materializeFromEvents(requestId, nextEvents, {
    updatedAt: now,
    isProcessing: false,
    processingBy: null,
    processingStartedAt: null,
    lastTransitionAt: now,
    lastTransitionType: config.eventType,
    ...extra.fields,
  });

  tx.update(ref, patch);
  return { events: nextEvents, now, status: patch.status, snapshot: patch.dismissalSnapshot };
}

function serializeRequest(id, data) {
  const derived = resolveEffectiveState(data);
  const { drift, statusDrift, snapshotDrift } = detectDrift(data);
  return {
    id,
    ...data,
    status: derived,
    derivedStatus: derived,
    statusDrift: drift,
    statusDriftDetail: { statusDrift, snapshotDrift },
  };
}

export async function createDismissalRequestApi(db, uid, body) {
  const user = await loadUser(db, uid);
  assertRole(user, new Set(['parent']), 'فقط ولي الأمر يمكنه إنشاء طلب تسريح');

  const schoolId = String(body.schoolId || user.schoolId || '');
  const studentId = String(body.studentId || '');
  if (!schoolId || !studentId) throw httpError('بيانات الطلب غير مكتملة', 'INVALID_BODY', 400);
  assertSchool(user, schoolId);

  const verified = await resolveStudent(db, studentId, uid, schoolId);
  if (await findActiveForStudent(db, studentId, schoolId)) {
    throw httpError('يوجد طلب تسريح نشط لهذا الطالب بالفعل', 'ACTIVE_EXISTS', 409);
  }

  const token = generateToken();
  const now = new Date();
  const parentName = String(body.parentName || user.name || '');
  const requestedByName = String(body.requestedByName || parentName || 'ولي أمر');
  const docRef = db.collection(DISMISSAL_COL).doc();
  const createEvent = makeEvent(docRef.id, EVENT_TYPES.REQUEST_CREATED, uid, {
    byName: requestedByName,
    idempotencyKey: body.idempotencyKey || `create:${studentId}:${Math.floor(Date.now() / 60000)}`,
    studentId: verified.studentId,
    classId: verified.classId,
  });

  if (body.idempotencyKey) {
    const dup = await db
      .collection(DISMISSAL_COL)
      .where('schoolId', '==', schoolId)
      .where('studentId', '==', studentId)
      .where('parentId', '==', uid)
      .limit(5)
      .get();
    const existing = dup.docs.find((d) => {
      const evs = d.data().dismissalEvents || [];
      return evs.some((e) => e.eventId === createEvent.eventId);
    });
    if (existing) throw duplicateEventError();
  }

  const events = [createEvent];
  const snapshot = buildSnapshot(docRef.id, events);
  const derived = deriveState(events);

  await docRef.set({
    schoolId: verified.schoolId,
    studentId: verified.studentId,
    studentName: verified.studentName,
    classId: verified.classId,
    className: verified.className,
    registrationNumber: verified.registrationNumber,
    photoUrl: verified.photoUrl,
    parentIds: verified.parentIds,
    parentId: uid,
    parentName,
    requestedByName,
    pickupPersonName: String(body.pickupPersonName || '').trim() || parentName,
    pickupPersonRelation: String(body.pickupPersonRelation || '').trim() || 'ولي أمر',
    pickupNote: String(body.pickupNote || '').trim(),
    status: derived,
    dismissalSnapshot: snapshot,
    token,
    tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    isProcessing: false,
    dismissalEvents: events,
    statusDrift: false,
    createdAt: now,
    updatedAt: now,
  });

  await writeSnapshotDoc(db, docRef.id, snapshot, verified.schoolId);

  return { id: docRef.id, token, status: derived, derivedStatus: derived, dismissalSnapshot: snapshot };
}

async function runTransitionApi(db, uid, body, cfg, actorName, extraFields = {}) {
  const requestId = String(body.requestId || '');
  if (!requestId) throw httpError('معرّف الطلب مطلوب', 'INVALID_BODY', 400);

  const { ref, data } = await getRequestOrThrow(db, requestId);
  const schoolId = String(data.schoolId || '');
  const idempotencyKey = body.idempotencyKey || body.clientIdempotencyKey;

  let result;
  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists) throw httpError('الطلب غير موجود', 'NOT_FOUND', 404);
    result = runTransitionTx(tx, ref, requestId, fresh.data(), uid, actorName, cfg, {
      idempotencyKey,
      metadata: extraFields.metadata,
      fields: extraFields.fields,
    });
  });

  if (result?.snapshot) {
    await writeSnapshotDoc(db, requestId, result.snapshot, schoolId);
  }

  return { id: requestId, status: result.status, derivedStatus: result.status, dismissalSnapshot: result.snapshot };
}

export async function guardVerifyDismissalApi(db, uid, body) {
  const user = await loadUser(db, uid);
  assertRole(user, new Set(['guard']), 'فقط الحارس يمكنه التحقق');
  const requestId = String(body.requestId || '');
  const note = String(body.note || '').trim();
  if (!requestId) throw httpError('معرّف الطلب مطلوب', 'INVALID_BODY', 400);

  const { data } = await getRequestOrThrow(db, requestId);
  const schoolId = String(data.schoolId || '');
  assertSchool(user, schoolId);
  await verifyStudentMatch(db, data, schoolId);

  return runTransitionApi(db, uid, body, TRANSITIONS.guardVerify, String(user.name || 'حارس'), {
    metadata: { note },
    fields: {
      guardVerifiedBy: uid,
      guardVerifiedByName: String(user.name || 'حارس'),
      guardVerifiedAt: new Date(),
    },
  });
}

export async function guardRejectDismissalApi(db, uid, body) {
  const user = await loadUser(db, uid);
  assertRole(user, new Set(['guard']), 'فقط الحارس يمكنه الرفض');
  const requestId = String(body.requestId || '');
  const reason = String(body.reason || body.rejectReason || '').trim();
  if (!requestId || !reason) throw httpError('معرّف الطلب وسبب الرفض مطلوبان', 'INVALID_BODY', 400);

  const { data } = await getRequestOrThrow(db, requestId);
  assertSchool(user, String(data.schoolId || ''));

  return runTransitionApi(db, uid, body, TRANSITIONS.guardReject, String(user.name || 'حارس'), {
    metadata: { reason },
    fields: {
      rejectReason: reason,
      rejectedBy: uid,
      rejectedByName: String(user.name || 'حارس'),
      rejectedAt: new Date(),
    },
  });
}

export async function managerApproveDismissalApi(db, uid, body) {
  const user = await loadUser(db, uid);
  assertRole(user, MANAGER_ROLES, 'فقط الإدارة يمكنها الاعتماد');
  const requestId = String(body.requestId || '');
  if (!requestId) throw httpError('معرّف الطلب مطلوب', 'INVALID_BODY', 400);

  const { ref, data } = await getRequestOrThrow(db, requestId);
  const schoolId = String(data.schoolId || '');
  assertSchool(user, schoolId);

  const managerName = String(user.name || 'مدير');
  const studentId = String(data.studentId || '');
  const studentRef = db.collection('students').doc(studentId);
  const cfg = TRANSITIONS.managerApprove;

  let result;
  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists) throw httpError('الطلب غير موجود', 'NOT_FOUND', 404);
    const freshData = fresh.data();

    result = runTransitionTx(tx, ref, requestId, freshData, uid, managerName, cfg, {
      idempotencyKey: body.idempotencyKey || body.clientIdempotencyKey,
      fields: {
        managerVerifiedBy: uid,
        managerVerifiedByName: managerName,
        managerVerifiedAt: new Date(),
        dismissedAt: new Date(),
      },
    });

    tx.update(studentRef, {
      gateDismissalStatus: 'dismissed',
      gateDismissedAt: new Date(),
      lastDismissalRequestId: requestId,
      updatedAt: new Date(),
    });

    const logRef = db.collection(DISMISSAL_LOGS_COL).doc();
    tx.set(logRef, {
      schoolId,
      requestId,
      studentId,
      studentName: String(data.studentName || ''),
      classId: String(data.classId || ''),
      className: String(data.className || ''),
      parentId: String(data.parentId || ''),
      action: EVENT_TYPES.DISMISSED,
      guardVerifiedBy: freshData.guardVerifiedBy || null,
      managerVerifiedBy: uid,
      createdAt: new Date(),
    });
  });

  if (result?.snapshot) {
    await writeSnapshotDoc(db, requestId, result.snapshot, schoolId);
  }

  return {
    id: requestId,
    status: result.status,
    derivedStatus: result.status,
    dismissalSnapshot: result.snapshot,
  };
}

export async function managerRejectDismissalApi(db, uid, body) {
  const user = await loadUser(db, uid);
  assertRole(user, MANAGER_ROLES, 'فقط الإدارة يمكنها الرفض');
  const requestId = String(body.requestId || '');
  const reason = String(body.reason || body.rejectReason || '').trim();
  if (!requestId || !reason) throw httpError('معرّف الطلب وسبب الرفض مطلوبان', 'INVALID_BODY', 400);

  const { data } = await getRequestOrThrow(db, requestId);
  assertSchool(user, String(data.schoolId || ''));

  return runTransitionApi(db, uid, body, TRANSITIONS.managerReject, String(user.name || 'مدير'), {
    metadata: { reason },
    fields: {
      rejectReason: reason,
      rejectedBy: uid,
      rejectedByName: String(user.name || 'مدير'),
      rejectedAt: new Date(),
    },
  });
}

export async function listPendingDismissalsApi(db, uid, query = {}) {
  const user = await loadUser(db, uid);
  const role = String(user.role || '');
  const schoolId = String(query.schoolId || user.schoolId || '');
  if (!schoolId) throw httpError('المدرسة مطلوبة', 'INVALID_BODY', 400);
  assertSchool(user, schoolId);

  if (role === 'guard') {
    const snap = await db
      .collection(DISMISSAL_COL)
      .where('schoolId', '==', schoolId)
      .where('status', 'in', GUARD_QUEUE)
      .limit(100)
      .get();
    return snap.docs
      .map((d) => serializeRequest(d.id, d.data()))
      .filter((r) => GUARD_QUEUE.includes(r.derivedStatus) && !r.isProcessing);
  }

  if (role === 'parent') {
    const snap = await db
      .collection(DISMISSAL_COL)
      .where('schoolId', '==', schoolId)
      .where('parentId', '==', uid)
      .limit(50)
      .get();
    return snap.docs
      .map((d) => serializeRequest(d.id, d.data()))
      .filter((r) => GUARD_QUEUE.includes(r.derivedStatus));
  }

  throw httpError('غير مصرح', 'FORBIDDEN_ROLE', 403);
}

export async function listVerifiedDismissalsApi(db, uid, query = {}) {
  const user = await loadUser(db, uid);
  assertRole(user, MANAGER_ROLES, 'فقط الإدارة يمكنها عرض الطلبات');
  const schoolId = String(query.schoolId || user.schoolId || '');
  if (!schoolId) throw httpError('المدرسة مطلوبة', 'INVALID_BODY', 400);
  assertSchool(user, schoolId);

  const snap = await db
    .collection(DISMISSAL_COL)
    .where('schoolId', '==', schoolId)
    .where('status', 'in', MANAGER_QUEUE)
    .limit(100)
    .get();

  return snap.docs
    .map((d) => serializeRequest(d.id, d.data()))
    .filter((r) => MANAGER_QUEUE.includes(r.derivedStatus) && !r.isProcessing);
}

export function registerDismissalRoutes(app, { getDb, verifyToken, jsonParser }) {
  const wrap = (fn) => async (req, res) => {
    try {
      const result = await fn(getDb(), req.user.uid, req.body || {});
      return res.json(result);
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.code || 'ERROR', message: e.message });
    }
  };

  app.post('/api/dismissal/request', verifyToken, jsonParser, wrap(createDismissalRequestApi));
  app.post('/api/dismissal/guard-verify', verifyToken, jsonParser, wrap(guardVerifyDismissalApi));
  app.post('/api/dismissal/guard-reject', verifyToken, jsonParser, wrap(guardRejectDismissalApi));
  app.post('/api/dismissal/manager-approve', verifyToken, jsonParser, wrap(managerApproveDismissalApi));
  app.post('/api/dismissal/manager-reject', verifyToken, jsonParser, wrap(managerRejectDismissalApi));

  app.get('/api/dismissal/pending', verifyToken, async (req, res) => {
    try {
      const rows = await listPendingDismissalsApi(getDb(), req.user.uid, req.query || {});
      return res.json({ requests: rows });
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.code || 'ERROR', message: e.message });
    }
  });

  app.get('/api/dismissal/verified', verifyToken, async (req, res) => {
    try {
      const rows = await listVerifiedDismissalsApi(getDb(), req.user.uid, req.query || {});
      return res.json({ requests: rows });
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.code || 'ERROR', message: e.message });
    }
  });
}

export { resolveEffectiveState, detectDrift, materializeFromEvents, buildSnapshot };
