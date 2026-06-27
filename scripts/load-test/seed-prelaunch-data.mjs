#!/usr/bin/env node
/**
 * Seed tagged pre-launch load-test data.
 *
 * Usage:
 *   node scripts/load-test/seed-prelaunch-data.mjs --preset=smoke --testRunId=prelaunch-20260603-smoke
 *
 * Production: add --confirm-production (still tags loadTest:true + testRunId).
 */
import { resolvePreset } from './lib/presets.mjs';
import {
  loadTestTags,
  loadTestEmail,
  schoolDocId,
  LOAD_TEST_EMAIL_DOMAIN,
} from './lib/tags.mjs';
import {
  parseCliArgs,
  loadConfig,
  assertSafeToMutate,
  writeCredentials,
} from './lib/safety.mjs';
import { initFirebaseAdmin, FieldValue } from './lib/firebase-admin.mjs';

async function createAuthUser(auth, { email, password, displayName }) {
  try {
    return await auth.createUser({ email, password, displayName, emailVerified: true });
  } catch (err) {
    if (err?.code === 'auth/email-already-exists') {
      const existing = await auth.getUserByEmail(email);
      await auth.updateUser(existing.uid, { password, displayName });
      return existing;
    }
    throw err;
  }
}

async function commitBatches(db, ops, batchSize = 400) {
  for (let i = 0; i < ops.length; i += batchSize) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + batchSize)) {
      if (op.type === 'set') batch.set(op.ref, op.data, { merge: op.merge ?? false });
      else if (op.type === 'delete') batch.delete(op.ref);
    }
    await batch.commit();
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function seedSchool(db, auth, config, flags, preset, schoolIndex, credentials) {
  const tags = loadTestTags(flags.testRunId);
  const schoolId = schoolDocId(flags.testRunId, schoolIndex);
  const studentsPerSchool = Math.max(1, Math.floor(preset.students / preset.schools));
  const password = config.testPassword;

  const schoolRef = db.collection('schools').doc(schoolId);
  const classA = `${schoolId}-c1`;
  const classB = `${schoolId}-c2`;
  const ops = [];

  ops.push({
    type: 'set',
    ref: schoolRef,
    data: {
      name: `LoadTest School ${schoolIndex}`,
      address: 'بغداد — اختبار',
      governorate: 'بغداد',
      status: 'active',
      planId: 'basic',
      studentCount: studentsPerSchool,
      subscriptionExpiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      showSubscriptionTimer: false,
      notificationsEnabled: true,
      ...tags,
      seededAt: FieldValue.serverTimestamp(),
    },
  });

  for (const [classId, className] of [
    [classA, 'الصف الأول أ'],
    [classB, 'الصف الأول ب'],
  ]) {
    ops.push({
      type: 'set',
      ref: db.collection('classes').doc(classId),
      data: {
        name: className,
        schoolId,
        ...tags,
        createdAt: FieldValue.serverTimestamp(),
      },
    });
  }

  const roleSpecs = [
    { role: 'admin', count: 1, extra: { status: 'active', subscriptionStatus: 'active' } },
    { role: 'teacher', count: 2, extra: { assignedClassIds: [classA], assignedClassId: classA, subjectName: 'رياضيات' } },
    { role: 'parent', count: 3, extra: { phoneNumber: `0770${String(schoolIndex).padStart(7, '0')}` } },
    { role: 'staff', count: 1, extra: { permissions: ['students', 'attendance'], salary: 500000 } },
  ];

  const schoolUsers = { admin: [], teacher: [], parent: [], staff: [] };
  let userCounter = 0;

  for (const spec of roleSpecs) {
    for (let u = 0; u < spec.count; u++) {
      userCounter += 1;
      const email = loadTestEmail(spec.role, schoolIndex, userCounter, flags.testRunId);
      const displayName = `LT ${spec.role} ${schoolIndex}-${u + 1}`;
      const userRecord = flags.dryRun
        ? { uid: `dry-${spec.role}-${schoolIndex}-${u}` }
        : await createAuthUser(auth, { email, password, displayName });

      const uid = userRecord.uid;
      schoolUsers[spec.role].push({ uid, email, role: spec.role, schoolId });

      ops.push({
        type: 'set',
        ref: db.collection('users').doc(uid),
        data: {
          uid,
          email,
          name: displayName,
          role: spec.role,
          schoolId,
          ...spec.extra,
          ...tags,
          createdAt: FieldValue.serverTimestamp(),
        },
      });
    }
  }

  const adminUid = schoolUsers.admin[0]?.uid;
  const teacherUid = schoolUsers.teacher[0]?.uid;
  const parentUids = schoolUsers.parent.map((p) => p.uid);

  if (adminUid) {
    ops.push({
      type: 'set',
      ref: schoolRef,
      data: { ownerUid: adminUid, adminEmail: schoolUsers.admin[0].email },
      merge: true,
    });
  }

  const studentIds = [];
  for (let s = 0; s < studentsPerSchool; s++) {
    const studentId = `${schoolId}-st${String(s + 1).padStart(4, '0')}`;
    studentIds.push(studentId);
    const parentUid = parentUids[s % parentUids.length];
    const classId = s % 2 === 0 ? classA : classB;

    ops.push({
      type: 'set',
      ref: db.collection('students').doc(studentId),
      data: {
        schoolId,
        name: `طالب اختبار ${schoolIndex}-${s + 1}`,
        classId,
        registrationNumber: `LT-${schoolIndex}-${s + 1}`,
        parentIds: [parentUid],
        totalTuition: 1200000,
        tuitionBalance: 400000,
        ...tags,
        createdAt: FieldValue.serverTimestamp(),
      },
    });

    if (s < 3) {
      const instId = `${studentId}-inst1`;
      ops.push({
        type: 'set',
        ref: db.collection('installments').doc(instId),
        data: {
          studentId,
          schoolId,
          amount: 300000,
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
          status: 'pending',
          ...tags,
          createdAt: FieldValue.serverTimestamp(),
        },
      });
    }
  }

  const dateKey = todayIso();
  ops.push({
    type: 'set',
    ref: db.collection('attendance').doc(`${schoolId}_${classA}_${dateKey}`),
    data: {
      schoolId,
      classId: classA,
      class: classA,
      className: 'الصف الأول أ',
      date: dateKey,
      records: Object.fromEntries(studentIds.slice(0, 5).map((id, i) => [id, i % 2 === 0 ? 'present' : 'absent'])),
      recordedBy: adminUid,
      ...tags,
      updatedAt: FieldValue.serverTimestamp(),
    },
  });

  for (let h = 0; h < 2; h++) {
    ops.push({
      type: 'set',
      ref: db.collection('homework').doc(`${schoolId}-hw${h + 1}`),
      data: {
        title: `واجب اختبار ${h + 1}`,
        content: 'محتوى واجب الاختبار',
        dueDate: todayIso(),
        classId: classA,
        className: 'الصف الأول أ',
        teacherId: teacherUid,
        teacherName: 'معلم اختبار',
        subjectName: 'رياضيات',
        schoolId,
        parentIds: parentUids,
        ...tags,
        createdAt: FieldValue.serverTimestamp(),
      },
    });
  }

  for (let g = 0; g < 5; g++) {
    const stId = studentIds[g % studentIds.length];
    ops.push({
      type: 'set',
      ref: db.collection('grades').doc(`${schoolId}-gr${g + 1}`),
      data: {
        schoolId,
        classId: classA,
        studentId: stId,
        studentName: `طالب ${g + 1}`,
        parentIds: parentUids,
        subject: 'رياضيات',
        score: 70 + g,
        maxScore: 100,
        percentage: 70 + g,
        term: 'monthly',
        year: String(new Date().getFullYear()),
        type: 'monthly',
        teacherId: teacherUid,
        ...tags,
        createdAt: FieldValue.serverTimestamp(),
      },
    });
  }

  for (let m = 0; m < 3; m++) {
    ops.push({
      type: 'set',
      ref: db.collection('market').doc(`${schoolId}-prod${m + 1}`),
      data: {
        schoolId,
        itemName: `منتج اختبار ${m + 1}`,
        name: `منتج اختبار ${m + 1}`,
        description: 'وصف منتج الاختبار',
        price: 25000 + m * 1000,
        stock: 50,
        quantity: 50,
        imageUrl: '',
        status: 'active',
        createdBy: adminUid,
        ...tags,
        createdAt: FieldValue.serverTimestamp(),
      },
    });
  }

  const convId = `${schoolId}_${parentUids[0]}`;
  ops.push({
    type: 'set',
    ref: db.collection('conversations').doc(convId),
    data: {
      conversationId: convId,
      schoolId,
      participants: [parentUids[0], adminUid].filter(Boolean),
      lastMessage: 'رسالة اختبار',
      ...tags,
      updatedAt: FieldValue.serverTimestamp(),
    },
  });

  ops.push({
    type: 'set',
    ref: db.collection('system_messages').doc(`${convId}-msg1`),
    data: {
      conversationId: convId,
      schoolId,
      senderId: parentUids[0],
      senderName: 'ولي أمر اختبار',
      senderRole: 'parent',
      receiverId: adminUid,
      content: 'رسالة اختبار تحميل',
      read: false,
      ...tags,
      createdAt: FieldValue.serverTimestamp(),
    },
  });

  for (let n = 0; n < 5; n++) {
    const recipient = parentUids[n % parentUids.length];
    ops.push({
      type: 'set',
      ref: db.collection('notifications').doc(`${schoolId}-notif${n + 1}`),
      data: {
        userId: recipient,
        recipientId: recipient,
        title: `إشعار اختبار ${n + 1}`,
        message: 'رسالة إشعار الاختبار',
        type: 'system',
        schoolId,
        read: false,
        category: 'system',
        routeTarget: 'overview',
        metadata: { testRunId: flags.testRunId },
        pushDelivery: { status: config.disableFcm ? 'skipped' : 'pending' },
        ...tags,
        createdAt: FieldValue.serverTimestamp(),
      },
    });
  }

  if (!flags.dryRun) {
    await commitBatches(db, ops);
  }

  credentials.schools.push({
    schoolId,
    admin: schoolUsers.admin[0],
    teachers: schoolUsers.teacher,
    parents: schoolUsers.parent,
    staff: schoolUsers.staff[0],
    studentIds,
  });

  credentials.users.push(...Object.values(schoolUsers).flat());
}

async function main() {
  const flags = parseCliArgs();
  const config = loadConfig(flags.configPath);
  assertSafeToMutate(config, flags, 'seed');

  if (!flags.testRunId) {
    flags.testRunId = `prelaunch-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${flags.preset}`;
  }

  const preset = resolvePreset(flags.preset);
  const db = initFirebaseAdmin(config);
  const auth = (await import('./lib/firebase-admin.mjs')).admin.auth();

  console.log('=== SchoolixIQ Pre-Launch Seed ===');
  console.log('Environment:', config.environment);
  console.log('Preset:', preset.key, `(${preset.schools} schools, ${preset.students} students)`);
  console.log('testRunId:', flags.testRunId);
  console.log('Dry run:', flags.dryRun);
  console.log('Email domain:', LOAD_TEST_EMAIL_DOMAIN);

  const credentials = {
    testRunId: flags.testRunId,
    preset: preset.key,
    environment: config.environment,
    password: config.testPassword,
    projectId: config.firebaseProjectId,
    seededAt: new Date().toISOString(),
    schools: [],
    users: [],
  };

  const started = Date.now();
  for (let i = 1; i <= preset.schools; i++) {
    await seedSchool(db, auth, config, flags, preset, i, credentials);
    if (i % 10 === 0 || i === preset.schools) {
      console.log(`  Seeded school ${i}/${preset.schools}`);
    }
  }

  const credFile = writeCredentials(flags.testRunId, credentials);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  console.log('\n✓ Seed complete');
  console.log('  Schools:', preset.schools);
  console.log('  Users:', credentials.users.length);
  console.log('  Students target:', preset.students);
  console.log('  Elapsed:', `${elapsed}s`);
  console.log('  Credentials:', credFile);
  console.log('\nNext: k6 run with K6_TEST_RUN_ID=' + flags.testRunId);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
