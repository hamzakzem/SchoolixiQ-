#!/usr/bin/env node
/**
 * SchoolixIQ — Node.js smoke test (read-only, no k6).
 *
 * Usage:
 *   node scripts/load-test/node-smoke-test.mjs --runId=prelaunch-smoke-001 --baseUrl=https://schoolixiq.com
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');

const MAX_USERS = 10;
const THRESHOLDS = {
  p95Ms: 2500,
  errorRate: 0.01,
  permissionDenied: 0,
  resourceExhausted: 0,
  indexErrors: 0,
};

function parseArgs(argv = process.argv.slice(2)) {
  const flags = { runId: null, baseUrl: null, apiKey: null, maxUsers: MAX_USERS };
  for (const arg of argv) {
    if (arg.startsWith('--runId=')) flags.runId = arg.split('=')[1];
    else if (arg.startsWith('--run-id=')) flags.runId = arg.split('=')[1];
    else if (arg.startsWith('--baseUrl=')) flags.baseUrl = arg.split('=')[1];
    else if (arg.startsWith('--base-url=')) flags.baseUrl = arg.split('=')[1];
    else if (arg.startsWith('--apiKey=')) flags.apiKey = arg.split('=')[1];
    else if (arg.startsWith('--maxUsers=')) flags.maxUsers = Number(arg.split('=')[1]) || MAX_USERS;
  }
  return flags;
}

function loadFirebaseConfig() {
  const file = path.join(ROOT, 'firebase-applet-config.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadCredentials(runId) {
  const file = path.join(__dirname, '.runs', runId, 'credentials.json');
  if (!fs.existsSync(file)) {
    throw new Error(
      `Credentials not found: ${file}\nRun seed first:\n  node scripts/load-test/seed-prelaunch-data.mjs --preset=smoke --testRunId=${runId}`,
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function pickTestUsers(credentials, maxUsers) {
  const users = credentials.users || [];
  const byRole = {};
  for (const u of users) {
    if (!byRole[u.role]) byRole[u.role] = [];
    byRole[u.role].push(u);
  }

  const targets = [
    { role: 'admin', count: 3 },
    { role: 'teacher', count: 3 },
    { role: 'parent', count: 3 },
    { role: 'staff', count: 1 },
  ];

  const picked = [];
  const seen = new Set();

  for (const { role, count } of targets) {
    for (const u of (byRole[role] || []).slice(0, count)) {
      if (picked.length >= maxUsers) break;
      if (seen.has(u.uid)) continue;
      seen.add(u.uid);
      picked.push(u);
    }
  }

  for (const u of users) {
    if (picked.length >= maxUsers) break;
    if (seen.has(u.uid)) continue;
    seen.add(u.uid);
    picked.push(u);
  }

  return picked.slice(0, maxUsers);
}

function schoolForUser(user, schools) {
  const match = (schools || []).find((s) => s.schoolId === user.schoolId);
  return match || { schoolId: user.schoolId };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function classifyFirestoreError(status, bodyText) {
  const text = `${status} ${bodyText}`.toLowerCase();
  if (text.includes('permission_denied') || text.includes('permission denied')) {
    return 'permission_denied';
  }
  if (text.includes('resource_exhausted') || text.includes('quota')) {
    return 'resource_exhausted';
  }
  if (text.includes('failed_precondition') && text.includes('index')) {
    return 'index_required';
  }
  return 'other';
}

async function timed(name, fn, stats) {
  const start = performance.now();
  try {
    const result = await fn();
    const ms = Math.round(performance.now() - start);
    stats.operations.push({ name, ok: true, ms, error: null });
    stats.durations.push(ms);
    return result;
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    const message = err?.message || String(err);
    stats.operations.push({ name, ok: false, ms, error: message });
    stats.durations.push(ms);
    stats.failures.push({ name, error: message });
    if (err?.firestoreKind) {
      stats[err.firestoreKind] += 1;
    }
    return null;
  }
}

async function firebaseLogin(apiKey, email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await res.text();
  if (!res.ok) {
    const err = new Error(`Auth failed (${res.status}): ${body.slice(0, 200)}`);
    err.firestoreKind = null;
    throw err;
  }
  const json = JSON.parse(body);
  if (!json.idToken) throw new Error('Auth response missing idToken');
  return { idToken: json.idToken, localId: json.localId, email: json.email };
}

function firestoreBase(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

async function firestoreGet(projectId, token, docPath) {
  const res = await fetch(`${firestoreBase(projectId)}/${docPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.text();
  if (!res.ok) {
    const kind = classifyFirestoreError(res.status, body);
    const err = new Error(`Firestore GET ${docPath} (${res.status}): ${body.slice(0, 180)}`);
    err.firestoreKind = kind;
    throw err;
  }
  return JSON.parse(body);
}

async function firestoreRunQuery(projectId, token, structuredQuery) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ structuredQuery }),
  });
  const body = await res.text();
  if (!res.ok) {
    const kind = classifyFirestoreError(res.status, body);
    const err = new Error(`Firestore runQuery (${res.status}): ${body.slice(0, 180)}`);
    err.firestoreKind = kind;
    throw err;
  }
  return JSON.parse(body);
}

function queryBySchool(collectionId, schoolId, limit = 25) {
  return {
    from: [{ collectionId }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'schoolId' },
        op: 'EQUAL',
        value: { stringValue: schoolId },
      },
    },
    limit,
  };
}

function parseFirestoreStringField(doc, fieldPath) {
  const fields = doc?.fields;
  if (!fields) return null;
  const v = fields[fieldPath];
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.arrayValue?.values?.length) {
    return v.arrayValue.values.map((x) => x.stringValue).filter(Boolean);
  }
  return null;
}

function queryStudentsBySchool(schoolId, limit = 25) {
  return queryBySchool('students', schoolId, limit);
}

function queryStudentsByClass(schoolId, classId, limit = 25) {
  return {
    from: [{ collectionId: 'students' }],
    where: {
      compositeFilter: {
        op: 'AND',
        filters: [
          {
            fieldFilter: {
              field: { fieldPath: 'schoolId' },
              op: 'EQUAL',
              value: { stringValue: schoolId },
            },
          },
          {
            fieldFilter: {
              field: { fieldPath: 'classId' },
              op: 'EQUAL',
              value: { stringValue: classId },
            },
          },
        ],
      },
    },
    limit,
  };
}

function queryStudentsByParent(uid, limit = 25) {
  return {
    from: [{ collectionId: 'students' }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'parentIds' },
        op: 'ARRAY_CONTAINS',
        value: { stringValue: uid },
      },
    },
    limit,
  };
}

async function readStudentsForRole(user, ctx, token, uid, schoolId, profileDoc) {
  const { projectId } = ctx;
  if (user.role === 'admin' || user.role === 'staff') {
    return firestoreRunQuery(projectId, token, queryStudentsBySchool(schoolId));
  }
  if (user.role === 'teacher') {
    const assigned =
      parseFirestoreStringField(profileDoc, 'assignedClassId') ||
      parseFirestoreStringField(profileDoc, 'assignedClassIds')?.[0] ||
      `${schoolId}-c1`;
    return firestoreRunQuery(projectId, token, queryStudentsByClass(schoolId, assigned));
  }
  if (user.role === 'parent') {
    return firestoreRunQuery(projectId, token, queryStudentsByParent(uid));
  }
  return firestoreRunQuery(projectId, token, queryStudentsBySchool(schoolId));
}

async function readClassesForRole(user, ctx, token, schoolId, profileDoc) {
  const { projectId } = ctx;
  if (user.role === 'admin' || user.role === 'staff') {
    return firestoreRunQuery(projectId, token, queryBySchool('classes', schoolId, 25));
  }
  const classId =
    parseFirestoreStringField(profileDoc, 'assignedClassId') ||
    parseFirestoreStringField(profileDoc, 'assignedClassIds')?.[0] ||
    `${schoolId}-c1`;
  return firestoreGet(projectId, token, `classes/${classId}`);
}

async function fetchLanding(baseUrl) {
  const res = await fetch(baseUrl, {
    headers: { Accept: 'text/html' },
    redirect: 'follow',
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Landing HTTP ${res.status}`);
  }
  if (!body.includes('<html') && !body.includes('<!DOCTYPE')) {
    throw new Error('Landing response is not HTML');
  }
  return { status: res.status, bytes: body.length };
}

function createStats() {
  return {
    operations: [],
    durations: [],
    failures: [],
    permission_denied: 0,
    resource_exhausted: 0,
    index_required: 0,
  };
}

async function runUserTests(user, ctx) {
  const { stats, projectId, apiKey, password, schools } = ctx;
  const label = `${user.role}:${user.email}`;
  const school = schoolForUser(user, schools);
  const schoolId = school.schoolId;

  const session = await timed(`login [${label}]`, () =>
    firebaseLogin(apiKey, user.email, password),
  stats);
  if (!session) return;

  const token = session.idToken;
  const uid = session.localId || user.uid;

  const profileDoc = await timed(`profile [${label}]`, () =>
    firestoreGet(projectId, token, `users/${uid}`), stats);

  if (schoolId && profileDoc) {
    await timed(`students [${label}]`, () =>
      readStudentsForRole(user, ctx, token, uid, schoolId, profileDoc), stats);

    await timed(`classes [${label}]`, () =>
      readClassesForRole(user, ctx, token, schoolId, profileDoc), stats);

    await timed(`notifications [${label}]`, () =>
      firestoreRunQuery(projectId, token, {
        from: [{ collectionId: 'notifications' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'userId' },
                  op: 'EQUAL',
                  value: { stringValue: uid },
                },
              },
              ...(schoolId
                ? [
                    {
                      fieldFilter: {
                        field: { fieldPath: 'schoolId' },
                        op: 'EQUAL',
                        value: { stringValue: schoolId },
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        limit: 15,
      }),
    stats);
  }
}

async function main() {
  const flags = parseArgs();
  if (!flags.runId) {
    console.error('Usage: node scripts/load-test/node-smoke-test.mjs --runId=<id> --baseUrl=<url>');
    process.exit(1);
  }

  const firebaseConfig = loadFirebaseConfig();
  const apiKey = flags.apiKey || firebaseConfig.apiKey;
  const projectId = firebaseConfig.projectId;
  const credentials = loadCredentials(flags.runId);
  const baseUrl = (flags.baseUrl || credentials.baseUrl || 'https://schoolixiq.com').replace(/\/$/, '');
  const password = credentials.password || 'LoadTest!SchoolixIQ2026';
  const users = pickTestUsers(credentials, flags.maxUsers);
  const schools = credentials.schools || [];

  if (users.length === 0) {
    console.error('No users in credentials.json');
    process.exit(1);
  }

  const stats = createStats();
  const started = Date.now();

  console.log('=== SchoolixIQ Node Smoke Test ===');
  console.log('runId:      ', flags.runId);
  console.log('baseUrl:    ', baseUrl);
  console.log('projectId:  ', projectId);
  console.log('users:      ', users.length);
  console.log('writes:     ', 'disabled');
  console.log('');

  // Global reads (use first admin token after login, or unauthenticated for landing)
  await timed('landing', () => fetchLanding(baseUrl), stats);

  // Login first admin for system/config
  const adminUser = users.find((u) => u.role === 'admin') || users[0];
  const adminSession = await timed(`login [system]`, () =>
    firebaseLogin(apiKey, adminUser.email, password), stats);

  if (adminSession) {
    await timed('system/config', () =>
      firestoreGet(projectId, adminSession.idToken, 'system/config'), stats);
  }

  for (const user of users) {
    await runUserTests(user, { stats, projectId, apiKey, password, schools });
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const total = stats.operations.length;
  const failed = stats.operations.filter((o) => !o.ok).length;
  const errorRate = total > 0 ? failed / total : 0;
  const sorted = [...stats.durations].sort((a, b) => a - b);
  const p95 = percentile(sorted, 95);
  const avg = sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;

  const failReasons = [];
  if (errorRate > THRESHOLDS.errorRate) {
    failReasons.push(`error rate ${(errorRate * 100).toFixed(1)}% > ${THRESHOLDS.errorRate * 100}%`);
  }
  if (p95 > THRESHOLDS.p95Ms) {
    failReasons.push(`p95 ${p95}ms > ${THRESHOLDS.p95Ms}ms`);
  }
  if (stats.permission_denied > THRESHOLDS.permissionDenied) {
    failReasons.push(`permission-denied: ${stats.permission_denied}`);
  }
  if (stats.resource_exhausted > THRESHOLDS.resourceExhausted) {
    failReasons.push(`resource-exhausted: ${stats.resource_exhausted}`);
  }
  if (stats.index_required > THRESHOLDS.indexErrors) {
    failReasons.push(`index-required: ${stats.index_required}`);
  }

  const passed = failReasons.length === 0;
  const proceedTo100 = passed && errorRate === 0 && stats.permission_denied === 0;

  console.log('--- Results ---');
  console.log('Operations:        ', total);
  console.log('Failed:            ', failed);
  console.log('Error rate:        ', `${(errorRate * 100).toFixed(2)}%`);
  console.log('Avg duration:      ', `${avg}ms`);
  console.log('p95 duration:      ', `${p95}ms`);
  console.log('permission-denied: ', stats.permission_denied);
  console.log('resource-exhausted:', stats.resource_exhausted);
  console.log('index-required:    ', stats.index_required);
  console.log('Elapsed:           ', `${elapsed}s`);
  console.log('');

  if (stats.failures.length > 0) {
    console.log('--- Failures ---');
    for (const f of stats.failures) {
      console.log(`  ✗ ${f.name}`);
      console.log(`    ${f.error}`);
    }
    console.log('');
  }

  console.log('--- Per-operation ---');
  for (const op of stats.operations) {
    const mark = op.ok ? '✓' : '✗';
    console.log(`  ${mark} ${op.name} — ${op.ms}ms`);
  }
  console.log('');

  console.log('══════════════════════════════════════');
  console.log(passed ? '  RESULT: PASS' : '  RESULT: FAIL');
  console.log('══════════════════════════════════════');

  if (failReasons.length > 0) {
    console.log('\nFailure reasons:');
    for (const r of failReasons) console.log(`  • ${r}`);
  }

  console.log('\n--- Next step ---');
  if (proceedTo100) {
    console.log('  ✓ Safe to proceed to 100-user load test (seed --preset=load100 + scale this script).');
  } else if (passed) {
    console.log('  ⚠ PASS with warnings — review failures before scaling to 100 users.');
  } else {
    console.log('  ✗ Do NOT scale to 100 users until failures are fixed.');
  }

  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error('Smoke test aborted:', err.message);
  process.exit(1);
});
