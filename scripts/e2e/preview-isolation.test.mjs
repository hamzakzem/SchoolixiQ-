// Proves the preview-isolation check really fails on unsafe configurations (and passes on the repo).  node scripts/e2e/preview-isolation.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
let pass = 0, fail = 0;
const T = (n, c) => { console.log(c ? 'PASS' : 'FAIL', n); c ? pass++ : fail++; };
const script = path.resolve('scripts/check-preview-isolation.mjs');
const run = (root) => spawnSync('node', [script, '--dist', 'does-not-exist'], { env: { ...process.env, ISOLATION_ROOT: root }, encoding: 'utf8' });
const mk = (files) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'iso-'));
  execSync('git init -q', { cwd: d });
  for (const [f, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), c); }
  execSync('git add -A', { cwd: d });
  return d;
};
const good = run(path.resolve('.'));
T('the repository passes the check', good.status === 0 && /All preview-isolation checks passed/.test(good.stdout));
let r = run(mk({ '.github/workflows/preview.yml': 'name: p\non:\n  pull_request:\n    branches: [main]\njobs:\n  d:\n    runs-on: ubuntu-latest\n    steps:\n      - run: firebase deploy --only firestore\n        env:\n          FIREBASE_PRIVATE_KEY: ${{ secrets.FIREBASE_PRIVATE_KEY }}\n' }));
T('FAILS when a pull_request workflow deploys with Firebase Admin secrets', r.status === 1 && /pull_request\/non-main AND deploys/.test(r.stdout));
r = run(mk({ '.github/workflows/b.yml': 'name: b\non:\n  push:\n    branches:\n      - claude/secure-deletion\njobs:\n  d:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo deploy to hostinger\n' }));
T('FAILS when a feature-branch push workflow deploys', r.status === 1);
r = run(mk({ '.env.preview': 'FIREBASE_PROJECT_ID=yala-safari-iq\nFIREBASE_CLIENT_EMAIL=x@yala-safari-iq.iam.gserviceaccount.com\n' }));
T('FAILS when a preview env file names the production project / Admin credentials', r.status === 1 && /preview config \.env\.preview/.test(r.stdout));
r = run(mk({ 'wrangler.toml': 'name="x"\n[vars]\nPROJECT="yala-safari-iq"\n' }));
T('FAILS when a Cloudflare preview config names the production project', r.status === 1);
r = run(mk({ 'leak.json': JSON.stringify({ client_email: 'a@b.iam.gserviceaccount.com' }).replace('client_email', 'client_email') }));
T('FAILS when a service-account email/key is committed', r.status === 1 && /service-account material/.test(r.stdout));
r = run(mk({ 'ok.txt': 'nothing here' }));
T('passes on a clean fixture (guard checks are independent of the fixture)', r.status === 0);

// ── real server (production mode, NO emulator variables = what a preview/production host looks like) ─────────────
import http from 'node:http';
import { spawn } from 'node:child_process';
if (fs.existsSync('dist/server.mjs')) {
  const PORT = 3790 + Math.floor(Math.random() * 100);
  const env = { ...process.env, NODE_ENV: 'production', PORT: String(PORT) };
  for (const k of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL']) delete env[k];
  const srv = spawn('node', ['dist/server.mjs'], { env, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 9000));
  const post = (host, p) => new Promise((resolve) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path: p, method: 'POST', headers: { Host: host, 'content-type': 'application/json' } }, (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => resolve({ s: res.statusCode, j: (() => { try { return JSON.parse(b); } catch { return {}; } })() })); });
    req.on('error', () => resolve({ s: 0, j: {} })); req.end('{}');
  });
  const routes = ['/api/records/delete', '/api/records/restore', '/api/records/purge', '/api/records/void-payment', '/api/records/resolve-financial-review', '/api/records/delete-school', '/api/records/delete-notifications', '/api/admin/delete-user', '/api/admin/delete-student', '/api/admin/delete-school', '/api/admin/schools/S1/permanent-delete', '/api/admin/messages/permanent-delete', '/api/admin/messages/purge-user-conversations', '/api/admin/distributors/D1/delete', '/api/admin/plans/P1/delete'];
  for (const host of ['yellowgreen-loris-564484.hostingersite.com', 'x.pages.dev', 'unknown.example.org']) {
    const res = await Promise.all(routes.map((p) => post(host, p)));
    T(`running server: all ${routes.length} destructive routes answer DESTRUCTIVE_OPS_DISABLED (503) for host ${host}`, res.every((x) => x.s === 503 && x.j.error === 'DESTRUCTIVE_OPS_DISABLED'));
  }
  const prod = await Promise.all(routes.map((p) => post('schoolixiq.com', p)));
  T('running server: for the production host the guard lets the request through to authentication (401, not 503)', prod.every((x) => x.s === 401 || x.s === 403 || x.s === 404));
  srv.kill();
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
