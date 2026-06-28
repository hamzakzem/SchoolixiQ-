#!/usr/bin/env node
/**
 * Validates concurrent write uniqueness (no 409 collisions).
 *
 * Usage:
 *   node scripts/load-test/node-certification-write-selftest.mjs \
 *     --runId=prelaunch-load100-001 --confirmProduction=true
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  firebaseLogin,
  firestoreCreate,
  loadTestFields,
  strField,
  tsField,
  mapField,
  classifyError,
} from './lib/cert-rest.mjs';
import { buildWriteDocId } from './lib/cert-write-ids.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');
const PRODUCTION_HOSTS = ['schoolixiq.com', 'www.schoolixiq.com'];

function parseArgs() {
  const flags = { runId: null, confirmProduction: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--runId=')) flags.runId = arg.split('=')[1];
    if (arg.startsWith('--baseUrl=')) flags.baseUrl = arg.split('=')[1];
    if (arg === '--confirmProduction=true') flags.confirmProduction = true;
  }
  return flags;
}

function isProductionBaseUrl(baseUrl) {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return PRODUCTION_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function loadCredentials(runId) {
  const file = path.join(__dirname, '.runs', runId, 'credentials.json');
  if (!fs.existsSync(file)) throw new Error(`Missing credentials: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function createAttendance(token, projectId, ctx, workerId, iteration) {
  const { schoolId, classId, testRunId, uid } = ctx;
  const attId = buildWriteDocId({
    testRunId,
    scenario: 'write-selftest',
    collection: 'attendance',
    workerId,
    iteration,
  });
  const studentRef = buildWriteDocId({
    testRunId,
    scenario: 'write-selftest',
    collection: 'student-ref',
    workerId,
    iteration,
  });
  const tags = loadTestFields(testRunId);
  return firestoreCreate(projectId, token, 'attendance', attId, {
    schoolId: strField(schoolId),
    classId: strField(classId),
    date: strField(todayIso()),
    records: mapField({ [studentRef]: strField('present') }),
    recordedBy: strField(uid),
    ...tags,
    updatedAt: tsField(),
  });
}

async function main() {
  const flags = parseArgs();
  if (!flags.runId) {
    console.error('Usage: node scripts/load-test/node-certification-write-selftest.mjs --runId=<id>');
    process.exit(1);
  }

  const baseUrl = flags.baseUrl || 'https://schoolixiq.com';
  if (isProductionBaseUrl(baseUrl) && !flags.confirmProduction) {
    console.error('Production requires --confirmProduction=true');
    process.exit(1);
  }

  const firebaseConfig = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'firebase-applet-config.json'), 'utf8'),
  );
  const credentials = loadCredentials(flags.runId);
  const admin = (credentials.users || []).find((u) => u.role === 'admin');
  if (!admin) throw new Error('No admin user in credentials');

  const password = credentials.password || 'LoadTest!SchoolixIQ2026';
  const projectId = firebaseConfig.projectId;
  const schoolId = admin.schoolId || credentials.schools?.[0]?.schoolId;
  const classId = `${schoolId}-c1`;

  console.log('=== Certification Write Self-Test ===');
  console.log('runId:   ', flags.runId);
  console.log('admin:   ', admin.email);
  console.log('schoolId:', schoolId);
  console.log('');

  const session = await firebaseLogin(firebaseConfig.apiKey, admin.email, password);
  const token = session.idToken;
  const uid = session.localId || admin.uid;

  const writeCtx = { schoolId, classId, testRunId: flags.runId, uid };

  const tasks = [0, 1, 2].map((i) =>
    createAttendance(token, projectId, writeCtx, i, i).then(
      (res) => ({ ok: true, i, name: res?.name }),
      (err) => ({ ok: false, i, error: err.message, kind: err?.kind }),
    ),
  );

  const results = await Promise.all(tasks);
  const ids = new Set();
  let failed = 0;

  for (const r of results) {
    if (r.ok) {
      console.log(`  ✓ concurrent write ${r.i}: ${r.name}`);
      if (ids.has(r.name)) {
        console.error(`  ✗ duplicate document name: ${r.name}`);
        failed += 1;
      }
      ids.add(r.name);
    } else {
      console.error(`  ✗ concurrent write ${r.i}: ${r.error}`);
      if (r.kind === 'script_error') {
        console.error('    → 409/INVALID — ID collision or malformed request');
      }
      failed += 1;
    }
  }

  const has409 = results.some((r) => !r.ok && /409|already exists/i.test(r.error || ''));
  if (has409) {
    console.error('\nFAIL: 409 Document already exists — fix buildWriteDocId');
    process.exit(1);
  }

  console.log('');
  if (failed > 0) {
    console.log(`RESULT: FAIL (${failed}/3 writes)`);
    process.exit(1);
  }
  console.log('RESULT: PASS — 3 concurrent attendance writes with unique IDs');
  console.log('\nTagged docs left for cleanup:');
  console.log(`  node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=${flags.runId}`);
  process.exit(0);
}

main().catch((err) => {
  const kind = classifyError(err?.status || 0, err?.message || '');
  console.error('Write self-test aborted:', err.message);
  if (kind === 'script_error') console.error('→ script_error');
  process.exit(1);
});
