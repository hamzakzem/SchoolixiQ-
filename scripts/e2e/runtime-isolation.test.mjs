// Preview/production isolation of the BACKEND: environment identity, Admin initialisation, workers, cron, startup writes.
// Unit tests of the real modules + tests that boot the REAL server (dist/server.mjs) without any emulator variables.
//   npm run build:server && node scripts/e2e/runtime-isolation.test.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { resolveDeployment, registerWorker, configureWorkers, tryStartWorkers, workerStatus, noteProductionHost, workersAllowedNow, _resetForTests, appUrlConfigFields, projectFromServiceAccountEmail, PRODUCTION_FIREBASE_PROJECT_ID } from '../../backend/runtimeEnv.mjs';

let pass = 0, fail = 0;
const T = (n, c, i = '') => { console.log(c ? 'PASS' : 'FAIL', n, i); c ? pass++ : fail++; };
const PROD = PRODUCTION_FIREBASE_PROJECT_ID;
const email = (p) => `svc@${p}.iam.gserviceaccount.com`;
const base = { NODE_ENV: 'production' };
const R = (env, clientEmail = '', explicitProjectId = '') => resolveDeployment({ env: { ...base, ...env }, clientEmail, explicitProjectId, hasPrivateKey: Boolean(clientEmail) });

// ── 1. identity matrix ────────────────────────────────────────────────────────────────────────────
let d = R({ DEPLOY_ENV: 'production' }, email(PROD));
T('production: DEPLOY_ENV=production + production credentials → production, Admin enabled, workers after a production-host request', d.kind === 'production' && d.adminAllowed && d.workers === 'after_production_host' && d.adminProjectId === PROD);
d = R({ DEPLOY_ENV: 'production' });
T('production without explicit credentials keeps today’s behaviour (default credentials path, Admin allowed)', d.kind === 'production' && d.adminAllowed && !d.hasCreds);
d = R({ DEPLOY_ENV: 'preview' }, email(PROD));
T('PREVIEW holding PRODUCTION credentials → Admin DISABLED, no workers, flagged as targeting production', d.kind === 'preview' && !d.adminAllowed && d.targetsProduction && d.workers === 'never' && /PRODUCTION/.test(d.adminReason));
for (const v of ['staging', 'development', 'dev', 'test', 'PREVIEW', ' preview ']) { d = R({ DEPLOY_ENV: v }, email(PROD)); T(`DEPLOY_ENV="${v}" with production credentials → Admin disabled`, !d.adminAllowed && d.kind === 'preview'); }
d = R({ DEPLOY_ENV: 'preview' }, email('schoolixiq-preview-x'));
T('preview on its OWN Firebase project → Admin enabled, workers may run (they act on the preview project only)', d.kind === 'preview' && d.adminAllowed && !d.targetsProduction && d.workers === 'now' && d.adminProjectId === 'schoolixiq-preview-x');
d = R({ DEPLOY_ENV: 'preview' });
T('preview without credentials → Admin disabled, no workers', !d.adminAllowed && d.workers === 'never');
for (const [label, env, em] of [['DEPLOY_ENV missing + production credentials', {}, email(PROD)], ['DEPLOY_ENV missing, no credentials', {}, ''], ['DEPLOY_ENV="prod" (ambiguous)', { DEPLOY_ENV: 'prod' }, email(PROD)], ['DEPLOY_ENV=production but NODE_ENV=development', { DEPLOY_ENV: 'production', NODE_ENV: 'development' }, email(PROD)], ['DEPLOY_ENV=production with ANOTHER project’s credentials', { DEPLOY_ENV: 'production' }, email('other-project')], ['credentials whose e-mail is not a service account', { DEPLOY_ENV: 'production' }, 'someone@example.com']]) {
  d = R(env, em);
  T(`ambiguous/missing configuration fails closed: ${label}`, d.kind === 'unknown' && !d.adminAllowed && d.workers === 'never');
}
d = R({ DEPLOY_ENV: 'production' }, email(PROD), 'some-other-id');
T('explicit FIREBASE_PROJECT_ID that disagrees with the credentials’ project → unverifiable → fail closed', d.kind === 'unknown' && !d.adminAllowed);
d = R({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085' }, email(PROD));
T('emulator runs are allowed (cannot reach production)', d.kind === 'emulator' && d.adminAllowed && d.workers === 'now');
d = R({ DEPLOY_ENV: 'preview', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085' }, email(PROD));
T('…but the emulator marker cannot be spoofed by a real project id: project is taken from the credentials e-mail', projectFromServiceAccountEmail(email(PROD)) === PROD && projectFromServiceAccountEmail('x@evil.com') === '');

// ── 2. worker registry (the code path server.ts uses to start every background process) ───────────
const log = { error() {} };
const run = (decision, steps) => { _resetForTests(); configureWorkers(decision, log); const started = []; for (const n of ['push', 'chat', 'sweep', 'scrub', 'migration', 'app-url']) registerWorker(n, () => started.push(n)); steps?.(); return started; };
let st = run(R({ DEPLOY_ENV: 'preview' }, email(PROD)));
T('preview+production credentials: NO worker starts (push, chat, sweep, scrub, migration, startup write)', st.length === 0 && !workersAllowedNow(R({ DEPLOY_ENV: 'preview' }, email(PROD))));
st = run(R({}, email(PROD)), () => { noteProductionHost('schoolixiq.com'); tryStartWorkers(); });
T('unknown environment: no worker starts even after a production-host request', st.length === 0);
st = run(R({ DEPLOY_ENV: 'production' }, email(PROD)));
T('production: nothing starts at boot (waits for proof of a production host)', st.length === 0 && workerStatus().waiting.length === 6);
noteProductionHost('yellowgreen-loris-564484.hostingersite.com'); tryStartWorkers();
T('…a request on a preview host is not proof', st.length === 0);
noteProductionHost('evilschoolixiq.com'); noteProductionHost('schoolixiq.com.evil.io'); tryStartWorkers();
T('…nor look-alike hosts', st.length === 0);
noteProductionHost('www.schoolixiq.com'); tryStartWorkers(); tryStartWorkers();
T('production host observed: all six workers start exactly once (idempotent)', st.length === 6 && new Set(st).size === 6);
st = run(R({ FIRESTORE_EMULATOR_HOST: 'x:1' }));
T('emulator: workers start immediately (existing test setup unchanged)', st.length === 6);
st = run(R({ DEPLOY_ENV: 'preview' }, email('schoolixiq-preview-x')));
T('preview on its own project: workers start immediately', st.length === 6);

// ── 3. startup write of the server URL (system/config) ─────────────────────────────────────────
T('production + production host → appUrl/appUrlProd', JSON.stringify(Object.keys(appUrlConfigFields({ kind: 'production', appUrl: 'https://schoolixiq.com/' }).fields)) === '["appUrl","appUrlProd"]');
T('production but APP_URL is a preview host → only the dev field (production URL is never overwritten)', JSON.stringify(Object.keys(appUrlConfigFields({ kind: 'production', appUrl: 'https://yellowgreen-loris-564484.hostingersite.com' }).fields)) === '["appUrlDev"]');
T('preview → dev field only', JSON.stringify(Object.keys(appUrlConfigFields({ kind: 'preview', appUrl: 'https://schoolixiq.com' }).fields)) === '["appUrlDev"]');
T('unknown environment → nothing is written', appUrlConfigFields({ kind: 'unknown', appUrl: 'https://schoolixiq.com' }).fields === null);
T('invalid APP_URL → nothing is written', appUrlConfigFields({ kind: 'production', appUrl: 'not a url' }).fields === null);

// ── 4. the REAL server, no emulator variables ───────────────────────────────────────────────────
if (!fs.existsSync('dist/server.mjs')) { console.log('SKIP real-server tests: dist/server.mjs missing (npm run build:server)'); }
else {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const keyEnv = privateKey.replace(/\n/g, '\\n');
  const keyBody = privateKey.split('\n')[1];
  const CRON = 'c'.repeat(40);
  let port = 3900 + Math.floor(Math.random() * 80);
  async function boot(extra) {
    const env = { ...process.env, NODE_ENV: 'production', PORT: String(++port), CRON_SECRET: CRON };
    for (const k of Object.keys(env)) if (/^(FIREBASE_|FIRESTORE_|GOOGLE_APPLICATION|GCLOUD_|DEPLOY_ENV|APP_URL|FUNCTIONS_EMULATOR)/.test(k)) delete env[k];
    Object.assign(env, extra);
    let out = '';
    const p = spawn('node', ['dist/server.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    p.stdout.on('data', (c) => (out += c)); p.stderr.on('data', (c) => (out += c));
    for (let i = 0; i < 80 && !out.includes('SERVER_READY'); i++) await new Promise((r) => setTimeout(r, 250));
    return { port: env.PORT, out: () => out, kill: () => p.kill() };
  }
  const req = (s, method, path, host, headers = {}) => new Promise((resolve) => {
    const r = http.request({ host: '127.0.0.1', port: s.port, path, method, headers: { Host: host, 'content-type': 'application/json', ...headers } }, (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => resolve({ s: res.statusCode, j: (() => { try { return JSON.parse(b); } catch { return {}; } })() })); });
    r.on('error', () => resolve({ s: 0, j: {} })); if (method === 'POST') r.end('{}'); else r.end();
  });
  const INTERNAL = ['/api/internal/tuition-reminders/run', '/api/internal/notifications/push-dispatch', '/api/internal/chat-escalation/run', '/api/internal/dismissal-recovery/run', '/api/internal/dismissal-compaction/run'];

  // 4a preview that INHERITED the production credentials
  let s = await boot({ DEPLOY_ENV: 'preview', FIREBASE_CLIENT_EMAIL: email(PROD), FIREBASE_PRIVATE_KEY: keyEnv, FIREBASE_PROJECT_ID: PROD, APP_URL: 'https://schoolixiq.com' });
  let status = await req(s, 'GET', '/api/public/status', 'yellowgreen-loris-564484.hostingersite.com');
  T('REAL server, preview + production credentials: Firebase Admin is DISABLED and says why', status.j.deployment?.kind === 'preview' && status.j.deployment?.adminEnabled === false && /PRODUCTION/.test(status.j.deployment?.adminReason) && status.j.deployment?.targetsProductionProject === true, JSON.stringify(status.j.deployment));
  T('…Firestore calls with that Admin fail (no production access, no silent fallback)', status.s === 503 && status.j.firestore?.ok === false);
  T('…no background worker started (push, chat notifications, sweep, scrub, migration, system/config write)', status.j.deployment?.workers?.started?.length === 0 && status.j.deployment?.workers?.allowedNow === false);
  const sweepsBlocked = await Promise.all(INTERNAL.map((p) => req(s, 'POST', p, 'yellowgreen-loris-564484.hostingersite.com', { 'x-cron-secret': CRON })));
  T('…every cron/scheduler endpoint answers 503 BACKGROUND_DISABLED even with the CORRECT cron secret', sweepsBlocked.every((x) => x.s === 503 && x.j.error === 'BACKGROUND_DISABLED'));
  const spoof = await Promise.all(INTERNAL.map((p) => req(s, 'POST', p, 'schoolixiq.com', { 'x-cron-secret': CRON })));
  T('…also when the request pretends to come from a production host (identity is the environment, not the Host header)', spoof.every((x) => x.s === 503 && x.j.error === 'BACKGROUND_DISABLED'));
  const dest = await Promise.all(['/api/records/delete', '/api/records/restore', '/api/records/void-payment', '/api/admin/delete-school'].map((p) => req(s, 'POST', p, 'schoolixiq.com')));
  T('…destructive endpoints cannot run either (Admin disabled)', dest.every((x) => x.s === 401 || x.s === 503));
  const logs = s.out(); s.kill();
  T('no private key material was written to the server log', !logs.includes(keyBody) && !logs.includes('BEGIN PRIVATE KEY') && !logs.includes(keyEnv.slice(60, 120)));
  T('the log states the decision', /\[ENV\] deployment=preview .*admin=DISABLED/.test(logs) && /Firebase Admin is DISABLED/.test(logs));

  // 4b same credentials, DEPLOY_ENV missing
  s = await boot({ FIREBASE_CLIENT_EMAIL: email(PROD), FIREBASE_PRIVATE_KEY: keyEnv, FIREBASE_PROJECT_ID: PROD });
  status = await req(s, 'GET', '/api/public/status', 'x.hostingersite.com');
  T('REAL server, DEPLOY_ENV missing + credentials: unknown → Admin disabled, no workers (fail closed)', status.j.deployment?.kind === 'unknown' && status.j.deployment?.adminEnabled === false && status.j.deployment?.workers?.started?.length === 0, JSON.stringify(status.j.deployment?.reason));
  s.kill();

  // 4c DEPLOY_ENV=production with credentials of another project
  s = await boot({ DEPLOY_ENV: 'production', FIREBASE_CLIENT_EMAIL: email('another-project'), FIREBASE_PRIVATE_KEY: keyEnv });
  status = await req(s, 'GET', '/api/public/status', 'schoolixiq.com');
  T('REAL server, DEPLOY_ENV=production + another project’s credentials: unknown, Admin disabled, nothing starts even on a production host', status.j.deployment?.kind === 'unknown' && !status.j.deployment?.adminEnabled && status.j.deployment?.workers?.started?.length === 0);
  s.kill();

  // 4d verified production (no credentials in this test: nothing can touch Firebase)
  s = await boot({ DEPLOY_ENV: 'production', APP_URL: 'https://schoolixiq.com' });
  status = await req(s, 'GET', '/api/public/status', 'yellowgreen-loris-564484.hostingersite.com');
  T('REAL server, production declaration: Admin enabled (as today), workers WAIT (nothing started at boot)', status.j.deployment?.kind === 'production' && status.j.deployment?.adminEnabled === true && status.j.deployment?.workers?.started?.length === 0 && status.j.deployment?.workers?.waiting?.length === 6);
  const viaPreview = await Promise.all(INTERNAL.map((p) => req(s, 'POST', p, 'yellowgreen-loris-564484.hostingersite.com', { 'x-cron-secret': CRON })));
  T('…a request on the preview host neither starts workers nor reaches cron', viaPreview.every((x) => x.s === 503 && x.j.error === 'BACKGROUND_DISABLED') && (await req(s, 'GET', '/api/public/status', 'x.hostingersite.com')).j.deployment.workers.started.length === 0);
  const destPrev = await Promise.all(['/api/records/delete', '/api/admin/delete-user', '/api/admin/messages/permanent-delete'].map((p) => req(s, 'POST', p, 'yellowgreen-loris-564484.hostingersite.com')));
  T('…and destructive endpoints answer DESTRUCTIVE_OPS_DISABLED on the preview host', destPrev.every((x) => x.s === 503 && x.j.error === 'DESTRUCTIVE_OPS_DISABLED'));
  await req(s, 'GET', '/api/public/status', 'schoolixiq.com');
  await new Promise((r) => setTimeout(r, 500));
  status = await req(s, 'GET', '/api/public/status', 'schoolixiq.com');
  T('first request on the production host: workers start (production keeps working)', status.j.deployment?.workers?.started?.length === 6 && status.j.deployment?.workers?.allowedNow === true, JSON.stringify(status.j.deployment?.workers));
  const prodCron = await req(s, 'POST', INTERNAL[0], 'schoolixiq.com', { 'x-cron-secret': CRON });
  T('…and the cron endpoint is reachable again on the production host (not blocked by the environment guard)', prodCron.j.error !== 'BACKGROUND_DISABLED', String(prodCron.s));
  s.kill();

  // 4e verified production + production credentials: initialises correctly (no request is made: no network)
  s = await boot({ DEPLOY_ENV: 'production', FIREBASE_CLIENT_EMAIL: email(PROD), FIREBASE_PRIVATE_KEY: keyEnv, FIREBASE_PROJECT_ID: PROD });
  const l2 = s.out(); s.kill();
  T('REAL server, production + production credentials: Admin initialises with the service account', /deployment=production/.test(l2) && /admin=enabled/.test(l2) && /Firebase Admin initialized with service account/.test(l2) && !l2.includes(keyBody));
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
