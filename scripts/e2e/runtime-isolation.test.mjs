// A preview can NEVER become production: deployment identity is environment-only; no HTTP header can promote it.
// Unit tests of the real modules + tests that boot the REAL server (dist/server.mjs) without emulator variables.
//   npm run build:server && node scripts/e2e/runtime-isolation.test.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { resolveDeployment, registerWorker, configureWorkers, tryStartWorkers, workerStatus, workersAllowedNow, _resetForTests, appUrlConfigFields, projectFromServiceAccountEmail, locationReport, PRODUCTION_FIREBASE_PROJECT_ID } from '../../backend/runtimeEnv.mjs';
import { requestHost, destructiveOpsAllowed, backgroundDestructiveAllowed, internalRouteHostDenied } from '../../backend/runtimeGuard.mjs';

let pass = 0, fail = 0;
const T = (n, c, i = '') => { console.log(c ? 'PASS' : 'FAIL', n, i); c ? pass++ : fail++; };
const PROD = PRODUCTION_FIREBASE_PROJECT_ID;
const email = (p) => `svc@${p}.iam.gserviceaccount.com`;
const PREVIEW_HOST = 'yellowgreen-loris-564484.hostingersite.com';
const base = { NODE_ENV: 'production', APP_URL: 'https://schoolixiq.com' };
const R = (env, clientEmail = '', explicitProjectId = '') => resolveDeployment({ env: { ...base, ...env }, clientEmail, explicitProjectId, hasPrivateKey: Boolean(clientEmail) });

// ── 1. identity matrix ─────────────────────────────────────────────────────────────────────────
let d = R({ DEPLOY_ENV: 'production' }, email(PROD));
T('production: DEPLOY_ENV=production + production credentials + APP_URL on a production host → Admin enabled, workers allowed NOW (no request needed)', d.kind === 'production' && d.adminAllowed && d.workers === 'now' && d.appUrlVerified && d.adminProjectId === PROD);
d = R({ DEPLOY_ENV: 'production' });
T('production without explicit credentials keeps today’s behaviour (default credentials path, Admin allowed)', d.kind === 'production' && d.adminAllowed && !d.hasCreds);
for (const url of [undefined, '', 'not a url', `https://${PREVIEW_HOST}`, 'https://evilschoolixiq.com', 'https://schoolixiq.com.evil.io', 'http://localhost:3000']) {
  d = resolveDeployment({ env: { NODE_ENV: 'production', DEPLOY_ENV: 'production', ...(url === undefined ? {} : { APP_URL: url }) }, clientEmail: email(PROD), hasPrivateKey: true });
  T(`production declared but APP_URL=${JSON.stringify(url)} → background work NEVER (fail closed, reason explains)`, d.kind === 'production' && d.workers === 'never' && !d.appUrlVerified && /APP_URL/.test(d.workersReason));
}
for (const v of ['preview', 'staging', 'development', 'dev', 'test', 'PREVIEW', ' preview ']) {
  for (const [label, em] of [['production credentials', email(PROD)], ['its own project credentials', email('schoolixiq-preview-x')], ['no credentials', '']]) {
    d = R({ DEPLOY_ENV: v }, em);
    T(`DEPLOY_ENV="${v}" + ${label} → workers NEVER, no production operations`, d.kind === 'preview' && d.workers === 'never' && !workersAllowedNow(d) && !destructiveOpsAllowed({ host: 'schoolixiq.com', deployment: d }).allowed && !backgroundDestructiveAllowed(d));
  }
}
d = R({ DEPLOY_ENV: 'preview' }, email(PROD));
T('preview holding PRODUCTION credentials → Admin disabled too (credentials ignored)', !d.adminAllowed && d.targetsProduction);
for (const [label, env, em] of [['DEPLOY_ENV missing + production credentials', {}, email(PROD)], ['DEPLOY_ENV missing, no credentials', {}, ''], ['DEPLOY_ENV="prod" (ambiguous)', { DEPLOY_ENV: 'prod' }, email(PROD)], ['DEPLOY_ENV=production but NODE_ENV=development', { DEPLOY_ENV: 'production', NODE_ENV: 'development' }, email(PROD)], ['DEPLOY_ENV=production with ANOTHER project’s credentials', { DEPLOY_ENV: 'production' }, email('other-project')], ['credentials whose e-mail is not a service account', { DEPLOY_ENV: 'production' }, 'someone@example.com']]) {
  d = R(env, em);
  T(`ambiguous/missing configuration fails closed: ${label}`, d.kind === 'unknown' && !d.adminAllowed && d.workers === 'never' && !backgroundDestructiveAllowed(d));
}
d = R({ DEPLOY_ENV: 'production' }, email(PROD), 'some-other-id');
T('explicit FIREBASE_PROJECT_ID that disagrees with the credentials’ project → unverifiable → fail closed', d.kind === 'unknown' && !d.adminAllowed);
d = R({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085' }, email(PROD));
T('emulator runs are allowed (cannot reach production)', d.kind === 'emulator' && d.adminAllowed && d.workers === 'now' && destructiveOpsAllowed({ host: '127.0.0.1', deployment: d }).allowed);
T('project id is taken from the credentials e-mail, not from a free-text variable', projectFromServiceAccountEmail(email(PROD)) === PROD && projectFromServiceAccountEmail('x@evil.com') === '');

// ── 2. request host is DENY-ONLY and forwarded-* headers are ignored ─────────────────────────────
T('requestHost() reads the Host header only', requestHost({ host: `${PREVIEW_HOST}:3000` }) === PREVIEW_HOST);
for (const h of ['x-forwarded-host', 'forwarded', 'x-original-host', 'x-host', 'x-forwarded-server', 'x-real-host']) {
  T(`requestHost() ignores the client-controllable "${h}" header`, requestHost({ host: PREVIEW_HOST, [h]: 'schoolixiq.com' }) === PREVIEW_HOST);
}
const prodId = R({ DEPLOY_ENV: 'production' }, email(PROD));
const prevId = R({ DEPLOY_ENV: 'preview' }, email('schoolixiq-preview-x'));
T('production identity + production Host → allowed', destructiveOpsAllowed({ host: 'schoolixiq.com', deployment: prodId }).allowed);
T('production identity + preview Host → denied (host can only deny)', destructiveOpsAllowed({ host: PREVIEW_HOST, deployment: prodId }).reason === 'PREVIEW_HOST');
T('production identity + unknown Host → denied', destructiveOpsAllowed({ host: 'localhost', deployment: prodId }).reason === 'HOST_NOT_PRODUCTION');
T('preview identity + production Host → STILL denied (a host name never grants anything)', !destructiveOpsAllowed({ host: 'schoolixiq.com', deployment: prevId }).allowed);
T('no identity supplied → denied', destructiveOpsAllowed({ host: 'schoolixiq.com' }).reason === 'NO_DEPLOYMENT_IDENTITY');
T('DELETION_DISABLED=true is a kill switch even for production', !destructiveOpsAllowed({ host: 'schoolixiq.com', deployment: prodId, env: { DELETION_DISABLED: 'true' } }).allowed);
T('cron host layer denies known preview domains and lets local callers through', internalRouteHostDenied(PREVIEW_HOST) && !internalRouteHostDenied('localhost') && !internalRouteHostDenied('schoolixiq.com'));
T('location report is diagnostic only (domain found in a Hostinger-style path, compared with APP_URL)', JSON.stringify(locationReport({ cwd: '/home/u1/domains/schoolixiq.com/hbuilds/current/nodejs', appUrlHost: 'schoolixiq.com' })) === '{"domainInPath":"schoolixiq.com","matchesAppUrl":true}' && locationReport({ cwd: '/home/u1/domains/other.hostingersite.com/x', appUrlHost: 'schoolixiq.com' }).matchesAppUrl === false && locationReport({ cwd: '/srv/app', appUrlHost: 'schoolixiq.com' }).matchesAppUrl === null);

// ── 3. worker registry (the path server.ts uses to start every background process) ───────────────
const log = { error() {} };
const names = ['push', 'chat', 'sweep', 'scrub', 'migration', 'app-url'];
const run = (decision) => { _resetForTests(); configureWorkers(decision, log); const started = []; for (const n of names) registerWorker(n, () => started.push(n)); tryStartWorkers(); return started; };
T('preview (any credentials): NO worker starts, however often start is attempted', (() => { const s = run(R({ DEPLOY_ENV: 'preview' }, email(PROD))); tryStartWorkers(); tryStartWorkers(); return s.length === 0; })());
T('preview on its OWN project: still NO worker (preview is an absolute block)', run(R({ DEPLOY_ENV: 'preview' }, email('schoolixiq-preview-x'))).length === 0);
T('unknown environment: no worker', run(R({}, email(PROD))).length === 0);
T('production with APP_URL on a preview domain: no worker', run(R({ DEPLOY_ENV: 'production', APP_URL: `https://${PREVIEW_HOST}` }, email(PROD))).length === 0);
const st = run(R({ DEPLOY_ENV: 'production' }, email(PROD)));
T('verified production: all six workers start at boot, exactly once, with no request involved', st.length === 6 && new Set(st).size === 6 && (tryStartWorkers(), st.length === 6));
T('emulator: workers start immediately (existing test setup unchanged)', run(R({ FIRESTORE_EMULATOR_HOST: 'x:1' })).length === 6);

// ── 4. startup write of the server URL (system/config) ─────────────────────────────────────────
T('production + production host → appUrl/appUrlProd', JSON.stringify(Object.keys(appUrlConfigFields({ kind: 'production', appUrl: 'https://schoolixiq.com/' }).fields)) === '["appUrl","appUrlProd"]');
T('production but APP_URL is a preview host → only the dev field (production URL never overwritten)', JSON.stringify(Object.keys(appUrlConfigFields({ kind: 'production', appUrl: `https://${PREVIEW_HOST}` }).fields)) === '["appUrlDev"]');
T('unknown environment → nothing is written', appUrlConfigFields({ kind: 'unknown', appUrl: 'https://schoolixiq.com' }).fields === null);

// ── 5. the REAL server, no emulator variables: header forgery matrix ───────────────────────────────
if (!fs.existsSync('dist/server.mjs')) { console.log('SKIP real-server tests: dist/server.mjs missing (npm run build:server)'); }
else {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const keyEnv = privateKey.replace(/\n/g, '\\n');
  const keyBody = privateKey.split('\n')[1];
  const CRON = 'c'.repeat(40);
  let port = 4100 + Math.floor(Math.random() * 80);
  async function boot(extra) {
    const env = { ...process.env, NODE_ENV: 'production', PORT: String(++port), CRON_SECRET: CRON, NOTIFICATION_CRON_SECRET: CRON, TUITION_CRON_SECRET: CRON, CHAT_CRON_SECRET: CRON };
    for (const k of Object.keys(env)) if (/^(FIREBASE_|FIRESTORE_|GOOGLE_APPLICATION|GCLOUD_|DEPLOY_ENV|APP_URL|FUNCTIONS_EMULATOR)/.test(k)) delete env[k];
    Object.assign(env, extra);
    let out = '';
    const p = spawn('node', ['dist/server.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    p.stdout.on('data', (c) => (out += c)); p.stderr.on('data', (c) => (out += c));
    for (let i = 0; i < 80 && !out.includes('SERVER_READY'); i++) await new Promise((r) => setTimeout(r, 250));
    return { port: env.PORT, out: () => out, kill: () => p.kill() };
  }
  const req = (s, method, path, headers = {}) => new Promise((resolve) => {
    const r = http.request({ host: '127.0.0.1', port: s.port, path, method, headers: { 'content-type': 'application/json', ...headers } }, (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => resolve({ s: res.statusCode, j: (() => { try { return JSON.parse(b); } catch { return {}; } })() })); });
    r.on('error', () => resolve({ s: 0, j: {} })); if (method === 'POST') r.end('{}'); else r.end();
  });
  const INTERNAL = ['/api/internal/tuition-reminders/run', '/api/internal/notifications/push-dispatch', '/api/internal/chat-escalation/run', '/api/internal/dismissal-recovery/run', '/api/internal/dismissal-compaction/run'];
  const DESTRUCTIVE = ['/api/records/delete', '/api/records/restore', '/api/records/purge', '/api/records/void-payment', '/api/records/resolve-financial-review', '/api/records/delete-school', '/api/records/delete-notifications', '/api/admin/delete-user', '/api/admin/delete-student', '/api/admin/delete-school', '/api/admin/schools/S1/permanent-delete', '/api/admin/messages/permanent-delete', '/api/admin/messages/purge-user-conversations', '/api/admin/distributors/D1/delete', '/api/admin/plans/P1/delete'];
  // every way a client can try to look like production
  const FORGERIES = [
    ['genuine preview Host', { Host: PREVIEW_HOST }],
    ['Host forged to schoolixiq.com', { Host: 'schoolixiq.com' }],
    ['X-Forwarded-Host forged', { Host: PREVIEW_HOST, 'X-Forwarded-Host': 'schoolixiq.com' }],
    ['Forwarded: host= forged', { Host: PREVIEW_HOST, Forwarded: 'host=schoolixiq.com;proto=https' }],
    ['X-Original-Host + X-Host forged', { Host: PREVIEW_HOST, 'X-Original-Host': 'schoolixiq.com', 'X-Host': 'schoolixiq.com' }],
    ['all of them together + X-Forwarded-Proto/For', { Host: 'schoolixiq.com', 'X-Forwarded-Host': 'schoolixiq.com', Forwarded: 'host=schoolixiq.com', 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '127.0.0.1' }],
    ['Host: localhost (local cron style)', { Host: 'localhost' }],
  ];
  const state = async (s) => (await req(s, 'GET', '/api/public/status', { Host: 'localhost' })).j.deployment;

  // 5a PREVIEW identity, with every kind of credential, under every forgery: nothing may run
  for (const [credLabel, extra] of [
    ['production credentials inherited', { FIREBASE_CLIENT_EMAIL: email(PROD), FIREBASE_PRIVATE_KEY: keyEnv, FIREBASE_PROJECT_ID: PROD, APP_URL: 'https://schoolixiq.com' }],
    ['its own project credentials', { FIREBASE_CLIENT_EMAIL: email('schoolixiq-preview-x'), FIREBASE_PRIVATE_KEY: keyEnv, FIREBASE_STORAGE_BUCKET: 'schoolixiq-preview-x.firebasestorage.app', APP_URL: `https://${PREVIEW_HOST}` }],
    ['no credentials, APP_URL pretending production', { APP_URL: 'https://schoolixiq.com' }],
  ]) {
    const s = await boot({ DEPLOY_ENV: 'preview', ...extra });
    let bad = [];
    for (const [fLabel, hdr] of FORGERIES) {
      for (const p of INTERNAL) { const r = await req(s, 'POST', p, { ...hdr, 'x-cron-secret': CRON }); if (!(r.s === 503 && r.j.error === 'BACKGROUND_DISABLED')) bad.push(`cron ${p} [${fLabel}] -> ${r.s}`); }
      for (const p of DESTRUCTIVE) { const r = await req(s, 'POST', p, { ...hdr, Authorization: 'Bearer x.y.z' }); if (!(r.s === 503 && r.j.error === 'DESTRUCTIVE_OPS_DISABLED')) bad.push(`destructive ${p} [${fLabel}] -> ${r.s}`); }
    }
    const dep = await state(s);
    T(`REAL server, DEPLOY_ENV=preview + ${credLabel}: ${FORGERIES.length} header-forgery variants × ${INTERNAL.length} cron routes (CORRECT secret) + ${DESTRUCTIVE.length} destructive routes → ALL refused`, bad.length === 0, bad.slice(0, 3).join(' | '));
    T('…and no worker ever started (push, chat, sweep, scrub, migration, system/config write)', dep?.workers?.started?.length === 0 && dep?.workers?.allowedNow === false && dep?.workers?.mode === 'never', JSON.stringify(dep?.workers));
    const logs = s.out(); s.kill();
    T('…and no key material reached the log', !logs.includes(keyBody) && !logs.includes('BEGIN PRIVATE KEY') && !logs.includes(keyEnv.slice(60, 120)));
  }

  // 5b UNKNOWN identity (DEPLOY_ENV missing) under forgery
  let s = await boot({ FIREBASE_CLIENT_EMAIL: email(PROD), FIREBASE_PRIVATE_KEY: keyEnv, FIREBASE_PROJECT_ID: PROD, APP_URL: 'https://schoolixiq.com' });
  let bad = [];
  for (const [fLabel, hdr] of FORGERIES) for (const p of INTERNAL) { const r = await req(s, 'POST', p, { ...hdr, 'x-cron-secret': CRON }); if (!(r.s === 503 && r.j.error === 'BACKGROUND_DISABLED')) bad.push(`${p} [${fLabel}] -> ${r.s}`); }
  let dep = await state(s);
  T('REAL server, DEPLOY_ENV missing (unknown): cron refused under every forgery, Admin disabled, no worker', bad.length === 0 && dep?.kind === 'unknown' && dep?.adminEnabled === false && dep?.workers?.started?.length === 0, bad[0] || '');
  s.kill();

  // 5c PRODUCTION declared but APP_URL is not a production host (e.g. a preview that copied DEPLOY_ENV only)
  s = await boot({ DEPLOY_ENV: 'production', APP_URL: `https://${PREVIEW_HOST}` });
  bad = [];
  for (const [fLabel, hdr] of FORGERIES) for (const p of INTERNAL) { const r = await req(s, 'POST', p, { ...hdr, 'x-cron-secret': CRON }); if (!(r.s === 503 && r.j.error === 'BACKGROUND_DISABLED')) bad.push(`${p} [${fLabel}] -> ${r.s}`); }
  dep = await state(s);
  T('REAL server, DEPLOY_ENV=production but APP_URL on the preview domain: cron refused under every forgery, no worker started', bad.length === 0 && dep?.workers?.started?.length === 0 && dep?.appUrlVerified === false, bad[0] || '');
  s.kill();

  // 5d verified production: identity grants, headers only deny; nothing depends on a request
  s = await boot({ DEPLOY_ENV: 'production', APP_URL: 'https://schoolixiq.com' });
  dep = await state(s);
  T('REAL server, verified production: all six workers are running at boot with ZERO requests having carried any production host', dep?.kind === 'production' && dep?.adminEnabled === true && dep?.workers?.started?.length === 6 && dep?.workers?.allowedNow === true, JSON.stringify(dep?.workers?.started));
  const denyPreview = await Promise.all(DESTRUCTIVE.slice(0, 4).map((p) => req(s, 'POST', p, { Host: PREVIEW_HOST, 'X-Forwarded-Host': 'schoolixiq.com' })));
  T('…a request addressed to a preview Host is denied even if it forges X-Forwarded-Host (host only denies)', denyPreview.every((x) => x.s === 503 && x.j.error === 'DESTRUCTIVE_OPS_DISABLED'));
  const okHost = await req(s, 'POST', '/api/records/delete', { Host: 'schoolixiq.com' });
  T('…and the production Host reaches authentication (401), i.e. production keeps working', okHost.s === 401, String(okHost.s));
  const cronPreviewHost = await req(s, 'POST', INTERNAL[1], { Host: PREVIEW_HOST, 'x-cron-secret': CRON });
  T('…cron addressed to a preview Host is refused even in a production-identity process', cronPreviewHost.s === 503 && cronPreviewHost.j.error === 'BACKGROUND_DISABLED');
  const cronLocal = await req(s, 'POST', INTERNAL[1], { Host: 'localhost', 'x-cron-secret': CRON });
  T('…cron from a local caller is not blocked by the environment guard (reaches the handler)', cronLocal.j.error !== 'BACKGROUND_DISABLED', String(cronLocal.s));
  s.kill();

  // 5e verified production + production credentials initialises correctly (no request: no network)
  s = await boot({ DEPLOY_ENV: 'production', APP_URL: 'https://schoolixiq.com', FIREBASE_CLIENT_EMAIL: email(PROD), FIREBASE_PRIVATE_KEY: keyEnv, FIREBASE_PROJECT_ID: PROD });
  const l2 = s.out(); s.kill();
  T('REAL server, production + production credentials: Admin initialises with the service account, key never logged', /deployment=production/.test(l2) && /admin=enabled/.test(l2) && /Firebase Admin initialized with service account/.test(l2) && !l2.includes(keyBody));
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
