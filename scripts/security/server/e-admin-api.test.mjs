// E. Custom claims / backend trust, plus dismissal (pickup) safety and password-in-logs checks.
//
// Runs the repository's own server.ts LOCALLY (tsx, development mode) wired to the emulators with a
// demo- project id. No credentials are provided, outbound proxies are pointed at a dead port, and
// the Storage/upload route is not exercised (it would need a bucket). Production is never contacted.
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECT_ID, FIRESTORE_HOST, AUTH_HOST, adminDb, adminAuth, readDoc } from '../lib/harness.mjs';
import { seedWorld, seedAuthAccounts, USERS, SYNTHETIC_PASSWORD } from '../lib/fixtures.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const resultsDir = process.env.SECURITY_RESULTS_DIR || path.join(repoRoot, 'scripts/security/results/latest');
const PORT = Number(process.env.SECURITY_SERVER_PORT || 3911);
const API = `http://127.0.0.1:${PORT}`;
const SENTINEL = `Sentinel-Secret-${Date.now()}-Zq9!`;

let server;
let serverLog = '';

async function signIn(email, password = SYNTHETIC_PASSWORD) {
  const r = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const j = await r.json();
  return j.idToken || null;
}
async function api(token, method, p, body) {
  const r = await fetch(API + p, { method, headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await r.json(); } catch { /* not json */ }
  return { status: r.status, json };
}
const claimsOf = async (uid) => (await adminAuth.getUser(uid)).customClaims || {};
const expectForbidden = (res, what) => assert.ok(res.status === 403 || res.status === 401,
  `SECURITY EXPECTATION VIOLATED — ${what} should be rejected (401/403) but the server returned ${res.status}: ${JSON.stringify(res.json).slice(0, 160)}`);

/** Fresh Firestore + Auth world for every test (server keeps running). */
async function freshWorld(extraAuth = []) {
  await seedWorld();
  await seedAuthAccounts(['super', 'admin1', 'admin1b', 'admin2', 'staff1', 'guard1', 'parent1', 'parent2', ...extraAuth]);
}
async function authUser(uid, email, doc) {
  await adminAuth.createUser({ uid, email, password: SYNTHETIC_PASSWORD, emailVerified: true });
  if (doc) await adminDb.doc(`users/${uid}`).set({ uid, email, ...doc });
}

describe('E. Backend: custom claims, trusted role source, dismissal, logs', () => {
  before(async () => {
    mkdirSync(resultsDir, { recursive: true });
    const env = {
      PATH: process.env.PATH, HOME: process.env.HOME,
      NODE_ENV: 'test', PORT: String(PORT),
      GCLOUD_PROJECT: PROJECT_ID, GOOGLE_CLOUD_PROJECT: PROJECT_ID,
      FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST, FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST,
      METADATA_SERVER_DETECTION: 'none',
      // Any accidental non-loopback HTTP(S) call fails fast instead of leaving the machine.
      HTTPS_PROXY: 'http://127.0.0.1:9', HTTP_PROXY: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', http_proxy: 'http://127.0.0.1:9',
      NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost',
    };
    server = spawn(path.join(repoRoot, 'node_modules/.bin/tsx'), ['server.ts'], { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', (d) => { serverLog += d; });
    server.stderr.on('data', (d) => { serverLog += d; });
    const deadline = Date.now() + 120_000;
    while (!serverLog.includes('SERVER_READY')) {
      if (server.exitCode !== null) throw new Error(`server exited early:\n${serverLog.slice(-2000)}`);
      if (Date.now() > deadline) throw new Error(`server did not become ready:\n${serverLog.slice(-2000)}`);
      await new Promise((r) => setTimeout(r, 250));
    }
  });

  after(() => {
    if (server && server.exitCode === null) server.kill('SIGTERM');
    writeFileSync(path.join(resultsDir, 'server-under-test.log'), serverLog);
  });

  beforeEach(() => freshWorld());

  // --- E1: Firestore role must not become a trusted custom claim ---------------------------
  it('[E1.1][C5] a Firestore-only role=superadmin (no claim) is rejected by the admin API', async () => {
    await authUser('n_e11', 'n_e11@x.test', { role: 'superadmin', schoolId: '' });
    const t = await signIn('n_e11@x.test');
    expectForbidden(await api(t, 'GET', '/api/admin/distributors/pending'), 'admin API with Firestore-only superadmin');
  });

  it('[E1.2][C5] calling the admin API must not write role=superadmin into custom claims from Firestore data', async () => {
    await authUser('n_e12', 'n_e12@x.test', { role: 'superadmin', schoolId: '' });
    await api(await signIn('n_e12@x.test'), 'GET', '/api/admin/distributors/pending');
    const c = await claimsOf('n_e12');
    assert.notEqual(c.role, 'superadmin', `SECURITY EXPECTATION VIOLATED — server promoted Firestore role into custom claims: ${JSON.stringify(c)}`);
  });

  it('[E1.3][C5] a stale superadmin claim is rejected once the Firestore profile is demoted', async () => {
    await authUser('n_e13', 'n_e13@x.test', { role: 'parent', schoolId: '' });
    await adminAuth.setCustomUserClaims('n_e13', { role: 'superadmin', schoolId: '', sv: 4, p: null });
    expectForbidden(await api(await signIn('n_e13@x.test'), 'POST', '/api/admin/backup'), 'backup with stale superadmin claim');
  });

  it('[E1.4][H2] a legacy schoolless "assistant" profile is not accepted as a platform assistant', async () => {
    await authUser('n_e14', 'n_e14@x.test', { role: 'assistant', schoolId: '', permissions: ['manage_packages'] });
    expectForbidden(await api(await signIn('n_e14@x.test'), 'POST', '/api/admin/plans', { name: 'evil', price: 0 }), 'plan creation by schoolless assistant');
  });

  // --- E2: client-supplied role / permissions / schoolId -----------------------------------
  it('[E2.1][C6] create-user ignores additionalData.role / schoolId (no superadmin via payload)', async () => {
    const t = await signIn(USERS.admin1.email);
    const r = await api(t, 'POST', '/api/admin/create-user', { email: 'puppet1@x.test', password: SYNTHETIC_PASSWORD, displayName: 'p', role: 'parent', schoolId: 'S1', additionalData: { role: 'superadmin', schoolId: '' } });
    const u = await adminAuth.getUserByEmail('puppet1@x.test').catch(() => null);
    const d = u ? await readDoc(`users/${u.uid}`) : null;
    assert.ok(!d || (d.role === 'parent' && d.schoolId === 'S1'),
      `SECURITY EXPECTATION VIOLATED — create-user (HTTP ${r.status}) stored role=${d?.role} schoolId=${JSON.stringify(d?.schoolId)} from additionalData`);
  });

  it('[E2.2][C6] create-user ignores client-supplied additionalData.permissions in custom claims', async () => {
    const t = await signIn(USERS.admin1.email);
    await api(t, 'POST', '/api/admin/create-user', { email: 'puppet2@x.test', password: SYNTHETIC_PASSWORD, displayName: 'p', role: 'parent', schoolId: 'S1', additionalData: { permissions: ['manage_users', 'manage_system'] } });
    const u = await adminAuth.getUserByEmail('puppet2@x.test').catch(() => null);
    const c = u ? await claimsOf(u.uid) : {};
    assert.ok(!Array.isArray(c.p) || !c.p.includes('manage_system'), `SECURITY EXPECTATION VIOLATED — client permissions copied into claims: ${JSON.stringify(c.p)}`);
  });

  it('[E2.3][C6] staff (allowed to create parents) cannot mint a superadmin profile through additionalData', async () => {
    const t = await signIn(USERS.staff1.email);
    await api(t, 'POST', '/api/admin/create-user', { email: 'puppet3@x.test', password: SYNTHETIC_PASSWORD, displayName: 'p', role: 'parent', schoolId: 'S1', additionalData: { role: 'superadmin', schoolId: '' } });
    const u = await adminAuth.getUserByEmail('puppet3@x.test').catch(() => null);
    const d = u ? await readDoc(`users/${u.uid}`) : null;
    assert.notEqual(d?.role, 'superadmin', 'SECURITY EXPECTATION VIOLATED — staff minted a superadmin profile');
  });

  it('[E2.4] CONTROL: school admin cannot create users for another school via the schoolId field', async () => {
    const t = await signIn(USERS.admin1.email);
    expectForbidden(await api(t, 'POST', '/api/admin/create-user', { email: 'x2@x.test', password: SYNTHETIC_PASSWORD, displayName: 'x', role: 'teacher', schoolId: 'S2' }), 'create-user into S2');
  });

  it('[E2.5] CONTROL: school admin can create a parent in its own school', async () => {
    const t = await signIn(USERS.admin1.email);
    const r = await api(t, 'POST', '/api/admin/create-user', { email: 'okparent@s1.test', password: SYNTHETIC_PASSWORD, displayName: 'ok', role: 'parent', schoolId: 'S1' });
    assert.equal(r.status, 200, `LEGITIMATE FLOW BROKEN — create parent returned ${r.status}: ${JSON.stringify(r.json)}`);
    const u = await adminAuth.getUserByEmail('okparent@s1.test');
    assert.equal((await readDoc(`users/${u.uid}`)).role, 'parent');
  });

  // --- E3: no superadmin through registration data -----------------------------------------
  it('[E3.1] a registration request carrying role=superadmin grants nothing', async () => {
    await authUser('n_e31', 'n_e31@x.test', { role: 'parent', schoolId: '' });
    await adminDb.doc('registrations/R_E31').set({ uid: 'n_e31', email: 'n_e31@x.test', status: 'approved', role: 'superadmin', isSuperAdmin: true });
    expectForbidden(await api(await signIn('n_e31@x.test'), 'GET', '/api/admin/distributors/pending'), 'admin API after superadmin-flavoured registration');
  });

  // --- E4: privileged role assignment needs a trusted source ---------------------------------
  it('[E4.1][M1] school admin cannot reset the password of a co-admin via create-user', async () => {
    const t = await signIn(USERS.admin1.email);
    await api(t, 'POST', '/api/admin/create-user', { email: USERS.admin1b.email, password: 'Attacker-Chosen-1!', displayName: 'x', role: 'teacher', schoolId: 'S1' });
    const stillWorks = await signIn(USERS.admin1b.email);
    assert.ok(stillWorks, 'SECURITY EXPECTATION VIOLATED — co-admin password was replaced by another admin');
  });

  it('[E4.2][M3] super admin "sync-claims" must not promote a tampered Firestore role into claims', async () => {
    await authUser('n_e42', 'n_e42@x.test', { role: 'superadmin', schoolId: '' }); // tampered doc (reachable via C1/C2)
    await api(await signIn(USERS.super.email), 'POST', '/api/admin/sync-claims', { uid: 'n_e42' });
    assert.notEqual((await claimsOf('n_e42')).role, 'superadmin', 'SECURITY EXPECTATION VIOLATED — privileged role synced from Firestore data');
  });

  it('[E4.3] CONTROL: school admin cannot sync claims of a user outside its school', async () => {
    expectForbidden(await api(await signIn(USERS.admin1.email), 'POST', '/api/admin/sync-claims', { uid: 'u_parent2' }), 'sync-claims across schools');
  });

  // --- E5: dismissal / pickup safety ---------------------------------------------------------
  it('[E5.1][C4][D1] a parent link that was never approved by the school must not allow a pickup request', async () => {
    // State reachable today through tests C1.1 + A4.2 (self-link + self-assigned school).
    await authUser('n_e51', 'n_e51@x.test', { role: 'parent', schoolId: 'S2' });
    await adminDb.doc('students/ST2').update({ parentIds: ['u_parent2', 'n_e51'] });
    expectForbidden(await api(await signIn('n_e51@x.test'), 'POST', '/api/dismissal/request', { studentId: 'ST2', schoolId: 'S2' }), 'pickup request by unapproved parent');
  });

  it('[E5.2] CONTROL: an unlinked parent cannot request a pickup', async () => {
    await authUser('n_e52', 'n_e52@x.test', { role: 'parent', schoolId: 'S2' });
    expectForbidden(await api(await signIn('n_e52@x.test'), 'POST', '/api/dismissal/request', { studentId: 'ST2', schoolId: 'S2' }), 'pickup request by unlinked parent');
  });

  it('[E5.3] CONTROL: the genuine parent can request a pickup and a guard of another school cannot verify it', async () => {
    const r = await api(await signIn(USERS.parent2.email), 'POST', '/api/dismissal/request', { studentId: 'ST2', schoolId: 'S2' });
    assert.equal(r.status, 200, `LEGITIMATE FLOW BROKEN — genuine pickup request returned ${r.status}: ${JSON.stringify(r.json)}`);
    const requestId = r.json?.requestId || r.json?.id || r.json?.data?.id;
    assert.ok(requestId, `no request id in ${JSON.stringify(r.json)}`);
    expectForbidden(await api(await signIn(USERS.guard1.email), 'POST', '/api/dismissal/guard-verify', { requestId, token: '000000' }), 'cross-school guard verify');
  });

  // --- F (server side): passwords never appear in logs or stored documents -------------------
  it('[F2.1][H7] passwords sent to create-user never appear in server logs, audit logs or profiles', async () => {
    const before = serverLog.length;
    const t = await signIn(USERS.admin1.email);
    const r = await api(t, 'POST', '/api/admin/create-user', { email: 'logcheck@s1.test', password: SENTINEL, displayName: 'log', role: 'parent', schoolId: 'S1' });
    assert.equal(r.status, 200, `create-user failed: ${JSON.stringify(r.json)}`);
    await api(t, 'POST', '/api/admin/create-user', { email: 'logcheck2@x.test', password: SENTINEL, displayName: 'log', role: 'teacher', schoolId: 'S2' }); // rejected path
    await new Promise((res) => setTimeout(res, 500));
    assert.ok(!serverLog.slice(before).includes(SENTINEL), 'SECURITY EXPECTATION VIOLATED — password written to server logs');
    const audit = await adminDb.collection('audit_logs').get();
    assert.ok(!JSON.stringify(audit.docs.map((d) => d.data())).includes(SENTINEL), 'SECURITY EXPECTATION VIOLATED — password stored in audit_logs');
    const users = await adminDb.collection('users').get();
    assert.ok(!JSON.stringify(users.docs.map((d) => d.data())).includes(SENTINEL), 'SECURITY EXPECTATION VIOLATED — password stored in a users document');
  });
});
