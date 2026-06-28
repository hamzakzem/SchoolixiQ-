import {
  firestoreGet,
  firestoreRunQuery,
  firestoreCreate,
  firestorePatch,
  firestoreDelete,
  queryBySchool,
  queryStudentsByClass,
  queryStudentsByParent,
  queryNotificationsForUser,
  queryHomeworkForTeacher,
  parseStringField,
  loadTestFields,
  strField,
  boolField,
  intField,
  tsField,
  mapField,
  fetchHttp,
} from './cert-rest.mjs';
import { withToken } from './cert-auth.mjs';
import { record } from './cert-metrics.mjs';
import { buildWriteDocId } from './cert-write-ids.mjs';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function schoolForUser(user, schools) {
  return (schools || []).find((s) => s.schoolId === user.schoolId) || { schoolId: user.schoolId };
}

function writeDocId(ctx, scenario, collection, workerId, iteration, userIndex = 0) {
  return buildWriteDocId({
    testRunId: ctx.testRunId,
    scenario,
    collection,
    workerId,
    iteration,
    userIndex: userIndex ?? workerId,
  });
}

async function op(col, meta, fn) {
  const kind = meta.kind || 'read';
  if (kind === 'read') col.firestoreReads += meta.firestoreReads ?? 1;
  if (kind === 'write') col.firestoreWrites += meta.firestoreWrites ?? 1;
  if (meta.http) col.httpCalls += 1;
  return record(col, meta, fn);
}

async function fsOp(col, ctx, user, meta, fn) {
  return op(col, meta, () =>
    withToken(ctx.sessionCache, user, ctx.projectId, (token) => fn(token)),
  );
}

export async function runLandingScenario(col, ctx) {
  const { baseUrl, projectId, adminUser } = ctx;

  await op(col, { scenario: 'landing', operation: 'GET /', kind: 'read', http: true }, () =>
    fetchHttp(baseUrl, { headers: { Accept: 'text/html' } }),
  );

  await op(col, { scenario: 'landing', operation: 'GET /favicon.ico', kind: 'read', http: true }, async () => {
    try {
      return await fetchHttp(`${baseUrl}/favicon.ico`);
    } catch {
      return { skipped: true };
    }
  });

  if (adminUser) {
    await fsOp(col, ctx, adminUser, { scenario: 'landing', operation: 'system/config', kind: 'read' }, (token) =>
      firestoreGet(projectId, token, 'system/config'),
    );
  }
}

export async function runAdminScenario(col, ctx, user, workerId, iteration = 0) {
  const { projectId, schools, testRunId, writesEnabled } = ctx;
  const school = schoolForUser(user, schools);
  const schoolId = school.schoolId;
  const classId = `${schoolId}-c1`;

  const profile = await fsOp(col, ctx, user, { scenario: 'admin', operation: 'profile', kind: 'read' }, (token) =>
    firestoreGet(projectId, token, `users/${user.uid}`),
  );
  if (!profile) return;

  const uid = user.uid;

  await fsOp(col, ctx, user, { scenario: 'admin', operation: 'school', kind: 'read' }, (token) =>
    firestoreGet(projectId, token, `schools/${schoolId}`),
  );

  await fsOp(col, ctx, user, { scenario: 'admin', operation: 'students', kind: 'read' }, (token) =>
    firestoreRunQuery(projectId, token, queryBySchool('students', schoolId, 30)),
  );

  await fsOp(col, ctx, user, { scenario: 'admin', operation: 'classes', kind: 'read' }, (token) =>
    firestoreRunQuery(projectId, token, queryBySchool('classes', schoolId, 25)),
  );

  await fsOp(col, ctx, user, { scenario: 'admin', operation: 'notifications', kind: 'read' }, (token) =>
    firestoreRunQuery(projectId, token, queryNotificationsForUser(uid, schoolId)),
  );

  await fsOp(col, ctx, user, { scenario: 'admin', operation: 'installments', kind: 'read' }, (token) =>
    firestoreRunQuery(projectId, token, queryBySchool('installments', schoolId, 20)),
  );

  if (!writesEnabled) return;

  const tags = loadTestFields(testRunId);
  const studentId = writeDocId(ctx, 'admin', 'students', workerId, iteration);
  const attId = writeDocId(ctx, 'admin', 'attendance', workerId, iteration);
  const notifId = writeDocId(ctx, 'admin', 'notifications', workerId, iteration);
  const prodId = writeDocId(ctx, 'admin', 'market', workerId, iteration);
  const msgId = writeDocId(ctx, 'admin', 'messages', workerId, iteration);

  await fsOp(col, ctx, user, { scenario: 'admin', operation: 'write:student', kind: 'write' }, (token) =>
    firestoreCreate(projectId, token, 'students', studentId, {
      schoolId: strField(schoolId),
      name: strField('Cert Test Student'),
      classId: strField(classId),
      registrationNumber: strField(`CERT-${workerId}-${iteration}`),
      ...tags,
      createdAt: tsField(),
    }),
  );

  await fsOp(col, ctx, user, { scenario: 'admin', operation: 'write:attendance', kind: 'write' }, (token) =>
    firestoreCreate(projectId, token, 'attendance', attId, {
      schoolId: strField(schoolId),
      classId: strField(classId),
      date: strField(todayIso()),
      records: mapField({ [studentId]: strField('present') }),
      recordedBy: strField(uid),
      ...tags,
      updatedAt: tsField(),
    }),
  );

  await fsOp(col, ctx, user, { scenario: 'admin', operation: 'write:notification', kind: 'write' }, (token) =>
    firestoreCreate(projectId, token, 'notifications', notifId, {
      userId: strField(uid),
      recipientId: strField(uid),
      title: strField('Cert test notification'),
      message: strField('Load test — no FCM'),
      type: strField('system'),
      schoolId: strField(schoolId),
      read: boolField(false),
      pushDelivery: mapField({ status: strField('skipped') }),
      ...tags,
      createdAt: tsField(),
    }),
  );

  await fsOp(col, ctx, user, { scenario: 'admin', operation: 'write:market', kind: 'write' }, (token) =>
    firestoreCreate(projectId, token, 'market', prodId, {
      schoolId: strField(schoolId),
      itemName: strField('Cert Test Product'),
      name: strField('Cert Test Product'),
      price: intField(1000),
      stock: intField(5),
      imageUrl: strField(''),
      status: strField('active'),
      createdBy: strField(uid),
      ...tags,
      createdAt: tsField(),
    }),
  );

  const convId = `${schoolId}_${uid}`;
  await fsOp(col, ctx, user, { scenario: 'admin', operation: 'write:chat_message', kind: 'write' }, (token) =>
    firestoreCreate(projectId, token, 'system_messages', msgId, {
      conversationId: strField(convId),
      schoolId: strField(schoolId),
      senderId: strField(uid),
      senderRole: strField('admin'),
      content: strField('Certification load test message'),
      read: boolField(false),
      ...tags,
      createdAt: tsField(),
    }),
  );
}

export async function runTeacherScenario(col, ctx, user, workerId, iteration = 0) {
  const { projectId, schools, testRunId, writesEnabled } = ctx;
  const school = schoolForUser(user, schools);
  const schoolId = school.schoolId;

  const profile = await fsOp(col, ctx, user, { scenario: 'teacher', operation: 'profile', kind: 'read' }, (token) =>
    firestoreGet(projectId, token, `users/${user.uid}`),
  );
  if (!profile) return;

  const uid = user.uid;
  const classId =
    parseStringField(profile, 'assignedClassId') ||
    parseStringField(profile, 'assignedClassIds')?.[0] ||
    `${schoolId}-c1`;

  await fsOp(col, ctx, user, { scenario: 'teacher', operation: 'class', kind: 'read' }, (token) =>
    firestoreGet(projectId, token, `classes/${classId}`),
  );

  await fsOp(col, ctx, user, { scenario: 'teacher', operation: 'students', kind: 'read' }, (token) =>
    firestoreRunQuery(projectId, token, queryStudentsByClass(schoolId, classId, 30)),
  );

  await fsOp(col, ctx, user, { scenario: 'teacher', operation: 'homework', kind: 'read' }, (token) =>
    firestoreRunQuery(projectId, token, queryHomeworkForTeacher(schoolId, classId, uid, 20)),
  );

  await fsOp(col, ctx, user, { scenario: 'teacher', operation: 'notifications', kind: 'read' }, (token) =>
    firestoreRunQuery(projectId, token, queryNotificationsForUser(uid, schoolId)),
  );

  if (!writesEnabled) return;

  const tags = loadTestFields(testRunId);
  const hwId = writeDocId(ctx, 'teacher', 'homework', workerId, iteration);

  await fsOp(col, ctx, user, { scenario: 'teacher', operation: 'write:homework', kind: 'write' }, (token) =>
    firestoreCreate(projectId, token, 'homework', hwId, {
      title: strField('Cert homework'),
      content: strField('Load test assignment'),
      schoolId: strField(schoolId),
      classId: strField(classId),
      teacherId: strField(uid),
      teacherName: strField('Cert Teacher'),
      subjectName: strField('رياضيات'),
      dueDate: strField(todayIso()),
      ...tags,
      createdAt: tsField(),
    }),
  );

  const studentId = school.studentIds?.[0];
  if (studentId) {
    const grId = writeDocId(ctx, 'teacher', 'grades', workerId, iteration);
    await fsOp(col, ctx, user, { scenario: 'teacher', operation: 'write:grade', kind: 'write' }, (token) =>
      firestoreCreate(projectId, token, 'grades', grId, {
        schoolId: strField(schoolId),
        classId: strField(classId),
        studentId: strField(studentId),
        studentName: strField('Cert Student'),
        subject: strField('رياضيات'),
        score: intField(85),
        maxScore: intField(100),
        percentage: intField(85),
        teacherId: strField(uid),
        ...tags,
        createdAt: tsField(),
      }),
    );
  }
}

export async function runParentScenario(col, ctx, user, workerId, iteration = 0) {
  const { projectId, schools, testRunId, writesEnabled } = ctx;
  const school = schoolForUser(user, schools);
  const schoolId = school.schoolId;
  const uid = user.uid;

  const profile = await fsOp(col, ctx, user, { scenario: 'parent', operation: 'profile', kind: 'read' }, (token) =>
    firestoreGet(projectId, token, `users/${uid}`),
  );
  if (!profile) return;

  await fsOp(col, ctx, user, { scenario: 'parent', operation: 'students', kind: 'read' }, (token) =>
    firestoreRunQuery(projectId, token, queryStudentsByParent(uid, 20)),
  );

  const classId = `${schoolId}-c1`;
  await fsOp(col, ctx, user, { scenario: 'parent', operation: 'class', kind: 'read' }, (token) =>
    firestoreGet(projectId, token, `classes/${classId}`),
  );

  await fsOp(col, ctx, user, { scenario: 'parent', operation: 'notifications', kind: 'read' }, (token) =>
    firestoreRunQuery(projectId, token, queryNotificationsForUser(uid, schoolId)),
  );

  await fsOp(col, ctx, user, { scenario: 'parent', operation: 'homework', kind: 'read' }, (token) =>
    firestoreRunQuery(projectId, token, queryBySchool('homework', schoolId, 15)),
  );

  if (!writesEnabled) return;

  const tags = loadTestFields(testRunId);
  const notifId = writeDocId(ctx, 'parent', 'notifications', workerId, iteration);

  const created = await fsOp(
    col,
    ctx,
    user,
    { scenario: 'parent', operation: 'write:notification_create', kind: 'write' },
    (token) =>
      firestoreCreate(projectId, token, 'notifications', notifId, {
        userId: strField(uid),
        recipientId: strField(uid),
        title: strField('Parent cert notification'),
        message: strField('Tagged test notification'),
        type: strField('system'),
        schoolId: strField(schoolId),
        read: boolField(false),
        pushDelivery: mapField({ status: strField('skipped') }),
        ...tags,
        createdAt: tsField(),
      }),
  );

  if (created?.name) {
    const docPath = `notifications/${notifId}`;
    await fsOp(
      col,
      ctx,
      user,
      { scenario: 'parent', operation: 'write:notification_mark_read', kind: 'write' },
      (token) => firestorePatch(projectId, token, docPath, { read: boolField(true) }, ['read']),
    );

    await fsOp(
      col,
      ctx,
      user,
      { scenario: 'parent', operation: 'write:notification_delete', kind: 'write' },
      (token) => firestoreDelete(projectId, token, docPath),
    );
  }
}

export async function runStaffScenario(col, ctx, user) {
  const { projectId, schools } = ctx;
  const school = schoolForUser(user, schools);
  const schoolId = school.schoolId;
  const uid = user.uid;

  const profile = await fsOp(col, ctx, user, { scenario: 'staff', operation: 'profile', kind: 'read' }, (token) =>
    firestoreGet(projectId, token, `users/${uid}`),
  );
  if (!profile) return;

  await fsOp(col, ctx, user, { scenario: 'staff', operation: 'students', kind: 'read' }, (token) =>
    firestoreRunQuery(projectId, token, queryBySchool('students', schoolId, 25)),
  );

  await fsOp(col, ctx, user, { scenario: 'staff', operation: 'classes', kind: 'read' }, (token) =>
    firestoreRunQuery(projectId, token, queryBySchool('classes', schoolId, 25)),
  );

  await fsOp(col, ctx, user, { scenario: 'staff', operation: 'attendance', kind: 'read' }, (token) =>
    firestoreRunQuery(projectId, token, queryBySchool('attendance', schoolId, 10)),
  );
}

export async function runScenarioForUser(col, ctx, user, workerId, iteration = 0) {
  switch (user.role) {
    case 'admin':
      return runAdminScenario(col, ctx, user, workerId, iteration);
    case 'teacher':
      return runTeacherScenario(col, ctx, user, workerId, iteration);
    case 'parent':
      return runParentScenario(col, ctx, user, workerId, iteration);
    case 'staff':
      return runStaffScenario(col, ctx, user);
    default:
      return runStaffScenario(col, ctx, user);
  }
}
