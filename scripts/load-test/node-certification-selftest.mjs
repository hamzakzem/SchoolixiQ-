#!/usr/bin/env node
/**
 * Validates Firestore REST runQuery format + auth before certification runs.
 *
 * Usage:
 *   node scripts/load-test/node-certification-selftest.mjs \
 *     --runId=prelaunch-load100-001 --baseUrl=https://schoolixiq.com
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  firebaseLogin,
  firestoreGet,
  firestoreRunQuery,
  firestoreApiBase,
  queryBySchool,
  queryNotificationsForUser,
  queryHomeworkForTeacher,
  classifyError,
} from './lib/cert-rest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');

function parseArgs() {
  const flags = { runId: null, baseUrl: null, role: 'admin' };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--runId=')) flags.runId = arg.split('=')[1];
    if (arg.startsWith('--baseUrl=')) flags.baseUrl = arg.split('=')[1];
    if (arg.startsWith('--role=')) flags.role = arg.split('=')[1];
  }
  return flags;
}

function loadCredentials(runId) {
  const file = path.join(__dirname, '.runs', runId, 'credentials.json');
  if (!fs.existsSync(file)) throw new Error(`Missing credentials: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function pickUser(credentials, role) {
  const user = (credentials.users || []).find((u) => u.role === role);
  if (!user) throw new Error(`No ${role} user in credentials`);
  return user;
}

async function assertQuery(label, fn) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
    return true;
  } catch (err) {
    const kind = err?.kind || classifyError(err?.status || 0, err?.message || '');
    console.error(`  ✗ ${label}`);
    console.error(`    ${err.message}`);
    if (kind === 'script_error') {
      console.error('    → INVALID_ARGUMENT / malformed request body (fix cert-rest.mjs)');
      process.exit(1);
    }
    return false;
  }
}

async function main() {
  const flags = parseArgs();
  if (!flags.runId) {
    console.error('Usage: node scripts/load-test/node-certification-selftest.mjs --runId=<id>');
    process.exit(1);
  }

  const firebaseConfig = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'firebase-applet-config.json'), 'utf8'),
  );
  const credentials = loadCredentials(flags.runId);
  const admin = pickUser(credentials, 'admin');
  const password = credentials.password || 'LoadTest!SchoolixIQ2026';
  const projectId = firebaseConfig.projectId;
  const schoolId = admin.schoolId || credentials.schools?.[0]?.schoolId;

  console.log('=== Certification Self-Test ===');
  console.log('runId:    ', flags.runId);
  console.log('projectId:', projectId);
  console.log('user:     ', admin.email);
  console.log('schoolId: ', schoolId);
  console.log('runQuery: ', `${firestoreApiBase(projectId)}/documents:runQuery`);
  console.log('');

  const session = await firebaseLogin(firebaseConfig.apiKey, admin.email, password);
  const token = session.idToken;
  const uid = session.localId || admin.uid;

  let failed = 0;

  if (
    !(await assertQuery('GET profile (users/{uid})', () =>
      firestoreGet(projectId, token, `users/${uid}`),
    ))
  ) {
    failed += 1;
  }

  if (
    !(await assertQuery('runQuery students by schoolId', () =>
      firestoreRunQuery(projectId, token, queryBySchool('students', schoolId, 5)),
    ))
  ) {
    failed += 1;
  }

  if (
    !(await assertQuery('runQuery classes by schoolId', () =>
      firestoreRunQuery(projectId, token, queryBySchool('classes', schoolId, 5)),
    ))
  ) {
    failed += 1;
  }

  if (
    !(await assertQuery('runQuery notifications by userId+schoolId', () =>
      firestoreRunQuery(projectId, token, queryNotificationsForUser(uid, schoolId, 5)),
    ))
  ) {
    failed += 1;
  }

  if (
    !(await assertQuery('GET system/config', () =>
      firestoreGet(projectId, token, 'system/config'),
    ))
  ) {
    failed += 1;
  }

  try {
    const teacher = pickUser(credentials, 'teacher');
    const teacherSession = await firebaseLogin(firebaseConfig.apiKey, teacher.email, password);
    const teacherToken = teacherSession.idToken;
    const teacherUid = teacherSession.localId || teacher.uid;
    const teacherSchoolId = teacher.schoolId || schoolId;
    const classId = `${teacherSchoolId}-c1`;

    if (
      !(await assertQuery('runQuery teacher homework (school+class+teacher)', () =>
        firestoreRunQuery(
          projectId,
          teacherToken,
          queryHomeworkForTeacher(teacherSchoolId, classId, teacherUid, 5),
        ),
      ))
    ) {
      failed += 1;
    }
  } catch (err) {
    console.error('  ✗ teacher homework self-test skipped:', err.message);
    failed += 1;
  }

  console.log('');
  if (failed > 0) {
    console.log(`RESULT: FAIL (${failed} checks)`);
    process.exit(1);
  }
  console.log('RESULT: PASS — runQuery format and auth are valid');
  process.exit(0);
}

main().catch((err) => {
  console.error('Self-test aborted:', err.message);
  process.exit(1);
});
