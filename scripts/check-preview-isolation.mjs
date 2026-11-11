#!/usr/bin/env node
/**
 * Fails (exit 1) when a Preview environment could reach production Firebase with destructive power.
 *   node scripts/check-preview-isolation.mjs [--dist dist]
 * Checks (static, no network, no secrets needed):
 *  1. no workflow deploys or injects Firebase Admin credentials on pull_request / non-main branches
 *  2. no preview/staging config file (.env.preview, *.preview.*, wrangler/pages config) names the production project or credentials
 *  3. no service-account material in tracked files or in the build output
 *  4. the runtime guard refuses destructive operations for every preview host and unknown host, and allows production hosts
 *  5. the server wires the guard (middleware + background sweep gate) and the client refuses destructive calls on preview hosts
 * INFO (not a failure): the committed web client config targets the production project — that is why 4 and 5 must hold.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { destructiveOpsAllowed, backgroundDestructiveAllowed, requestHost, DESTRUCTIVE_ROUTE_RE } from '../backend/runtimeGuard.mjs';
import { resolveDeployment, workersAllowedNow } from '../backend/runtimeEnv.mjs';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// ISOLATION_ROOT lets the self-test point workflows/config/secret scanning at a deliberately broken fixture repo
const root = process.env.ISOLATION_ROOT ? path.resolve(process.env.ISOLATION_ROOT) : repoRoot;
const PROD_PROJECT = 'yala-safari-iq';
let failures = 0;
const ok = (m) => console.log('PASS', m);
const bad = (m) => { failures += 1; console.log('FAIL', m); };
const info = (m) => console.log('INFO', m);
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const tracked = execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);

// 1. workflows
const wfDir = path.join(root, '.github/workflows');
for (const f of fs.existsSync(wfDir) ? fs.readdirSync(wfDir) : []) {
  const text = fs.readFileSync(path.join(wfDir, f), 'utf8');
  const onBlock = /^on:\s*\n([\s\S]*?)(?=^\S)/m.exec(text)?.[1] || '';
  const triggersPR = /pull_request(_target)?\s*:/.test(onBlock) || /^\s*pull_request(_target)?\s*$/m.test(onBlock);
  const nonMainPush = /push:\s*\n\s*branches:\s*\n((?:\s*-\s*.+\n)+)/.exec(onBlock)?.[1]?.split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim().replace(/["']/g, '')).filter(Boolean).some((b) => b !== 'main') ?? false;
  const usesAdminSecrets = /secrets\.(FIREBASE_PRIVATE_KEY|FIREBASE_CLIENT_EMAIL|FIREBASE_SERVICE_ACCOUNT|GOOGLE_APPLICATION_CREDENTIALS|FIREBASE_TOKEN)/i.test(text);
  const deploys = /(firebase deploy|deploy-firebase|hostinger|rsync|scp |ftp)/i.test(text);
  if ((triggersPR || nonMainPush) && (usesAdminSecrets || deploys)) bad(`workflow ${f} runs on pull_request/non-main AND deploys or uses Firebase credentials`);
  else ok(`workflow ${f}: ${triggersPR || nonMainPush ? 'PR/branch workflow without deploy or Firebase secrets' : 'runs only on main/manual'}`);
}

// 2. preview/staging config files
const previewFiles = tracked.filter((f) => /(^|\/)(\.env\.(preview|staging)|wrangler\.toml|\.dev\.vars|netlify\.toml|vercel\.json)$|\.(preview|staging)\.(json|env|ya?ml|toml)$/i.test(f));
if (previewFiles.length === 0) ok('no preview/staging configuration file is tracked (Cloudflare/Hostinger previews are configured outside the repo)');
for (const f of previewFiles) {
  const t = read(f);
  if (t.includes(PROD_PROJECT) || /FIREBASE_(PRIVATE_KEY|CLIENT_EMAIL)/.test(t)) bad(`preview config ${f} references the production Firebase project or Admin credentials`);
  else ok(`preview config ${f} does not reference production Firebase`);
}

// 3. secrets in tracked files / build output
const SECRET_RE = /-----BEGIN (RSA |EC )?PRIVATE KEY-----\s*[A-Za-z0-9+/=\n\\r]{200,}|"private_key"\s*:\s*"-----BEGIN|"client_email"\s*:\s*"[^"]+\.iam\.gserviceaccount\.com"/;
let leaked = [];
for (const f of tracked) {
  if (/\.(png|jpg|jpeg|webp|gif|ico|apk|woff2?|ttf|otf|mp4|mp3|pdf|lock)$/i.test(f) || f === 'package-lock.json') continue;
  let t; try { t = read(f); } catch { continue; }
  if (SECRET_RE.test(t)) leaked.push(f);
}
const distIdx = process.argv.indexOf('--dist');
const dist = path.join(root, distIdx > 0 ? process.argv[distIdx + 1] : 'dist');
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
for (const f of walk(dist).filter((x) => /\.(js|mjs|json|html|map|txt)$/.test(x))) { if (SECRET_RE.test(fs.readFileSync(f, 'utf8'))) leaked.push(path.relative(root, f)); }
if (leaked.length) bad(`service-account material found in: ${leaked.join(', ')}`); else ok(`no service-account material in tracked files or in ${path.relative(root, dist) || 'dist'} (${walk(dist).length} build files scanned)`);

// 4. deployment identity + guard behaviour (headers can only deny, never grant)
const mk = (env, clientEmail = '') => resolveDeployment({ env: { NODE_ENV: 'production', APP_URL: 'https://schoolixiq.com', ...env }, clientEmail, hasPrivateKey: Boolean(clientEmail) });
const prod = mk({ DEPLOY_ENV: 'production' }, 'svc@yala-safari-iq.iam.gserviceaccount.com');
const blockedHosts = ['yellowgreen-loris-564484.hostingersite.com', 'x.pages.dev', 'app-git-branch.vercel.app', 'foo.netlify.app', 'localhost', '203.0.113.7', 'evilschoolixiq.com', 'schoolixiq.com.evil.io', ''];
const allowedHosts = ['schoolixiq.com', 'www.schoolixiq.com', 'app.schoolixiq.iq'];
for (const h of blockedHosts) destructiveOpsAllowed({ host: h, deployment: prod }).allowed ? bad(`guard ALLOWS destructive ops for host "${h}" even for a production identity`) : ok(`guard denies host "${h}" (host can only deny)`);
for (const h of allowedHosts) destructiveOpsAllowed({ host: h, deployment: prod }).allowed ? ok(`production identity + production host ${h} → allowed`) : bad(`production identity + production host ${h} is blocked`);
for (const kind of ['preview', 'staging', 'development', 'dev', 'test']) {
  const dep = mk({ DEPLOY_ENV: kind }, 'svc@schoolixiq-preview-x.iam.gserviceaccount.com');
  const refused = !destructiveOpsAllowed({ host: 'schoolixiq.com', deployment: dep }).allowed && !backgroundDestructiveAllowed(dep) && !workersAllowedNow(dep);
  refused ? ok(`DEPLOY_ENV=${kind} is an absolute block (production host name, own credentials, cron and workers all refused)`) : bad(`DEPLOY_ENV=${kind} does not block everything`);
}
!destructiveOpsAllowed({ host: 'schoolixiq.com', deployment: mk({}, 'svc@yala-safari-iq.iam.gserviceaccount.com') }).allowed ? ok('DEPLOY_ENV missing (unknown identity) blocks') : bad('unknown identity does not block');
!destructiveOpsAllowed({ host: 'schoolixiq.com', deployment: mk({ DEPLOY_ENV: 'production', APP_URL: 'https://x.hostingersite.com' }, 'svc@yala-safari-iq.iam.gserviceaccount.com') }).allowed ? ok('production without APP_URL on a production host blocks') : bad('APP_URL not verified but allowed');
!destructiveOpsAllowed({ host: 'schoolixiq.com', deployment: prod, env: { DELETION_DISABLED: 'true' } }).allowed ? ok('DELETION_DISABLED=true is a working kill switch') : bad('kill switch ineffective');
destructiveOpsAllowed({ host: 'whatever', deployment: mk({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085' }) }).allowed ? ok('emulator runs are allowed (cannot reach production)') : bad('emulator runs blocked');
requestHost({ host: 'x.hostingersite.com', 'x-forwarded-host': 'schoolixiq.com', forwarded: 'host=schoolixiq.com' }) === 'x.hostingersite.com' ? ok('requestHost() ignores X-Forwarded-Host / Forwarded (client-controllable)') : bad('requestHost() trusts a forwarded header');
for (const p of ['/api/records/delete', '/api/records/restore', '/api/records/purge', '/api/records/void-payment', '/api/records/delete-school', '/api/admin/delete-user', '/api/admin/delete-student', '/api/admin/delete-school', '/api/admin/schools/S1/permanent-delete', '/api/admin/messages/permanent-delete', '/api/admin/messages/purge-user-conversations', '/api/admin/distributors/D1/delete', '/api/admin/plans/P1/delete']) {
  DESTRUCTIVE_ROUTE_RE.test(p) ? null : bad(`route ${p} is not covered by the destructive-route guard`);
}
ok('every known destructive route matches the guard pattern');

// 5. wiring
const readRepo = (p) => fs.readFileSync(path.join(repoRoot, p), 'utf8');
const server = readRepo('server.ts');
/destructiveOpsAllowed\(\{ host, deployment \}\)/.test(server) && /DESTRUCTIVE_ROUTE_RE\.test\(req\.path\)/.test(server) ? ok('server.ts applies the guard as middleware before any handler') : bad('server.ts does not apply the runtime guard');
/startDeletionSweep\(.*backgroundDestructiveAllowed\(deployment\)/.test(server) ? ok('server.ts gates the background sweep by deployment identity') : bad('server.ts does not gate the background sweep');
!/x-forwarded-host|noteProductionHost|noteServedHost|productionHostSeen/i.test(readRepo('backend/runtimeGuard.mjs').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '') + readRepo('backend/runtimeEnv.mjs').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '') + server.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')) ? ok('no code path grants production status from a request header or observed host (forwarded-host / host-seen logic removed)') : bad('a header/host based promotion path exists in runtimeGuard/runtimeEnv/server');
/PREVIEW_HOST_RE\.test\(window\.location\.hostname\)/.test(readRepo('src/lib/deletionApi.ts')) ? ok('client refuses destructive calls on preview hosts') : bad('client has no preview guard');

// 6. background-process inventory + identity wiring (backend/runtimeEnv.mjs)
const STARTERS = ['setupNotificationPushListener', 'setupSystemMessageNotifications', 'startDeletionSweep', 'scheduleCredentialScrub', 'scheduleChatThreadMigration'];
for (const st of STARTERS) {
  const calls = (server.match(new RegExp(`\\b${st}\\(`, 'g')) || []).length;
  const viaRegistry = new RegExp(`registerWorker\\('[^']+',\\s*\\(\\)\\s*=>\\s*\\{[^}]*\\b${st}\\(`).test(server);
  calls === 1 && viaRegistry ? ok(`${st} is started only through registerWorker (environment-gated)`) : bad(`${st} is called outside registerWorker (${calls} call sites)`);
}
/registerWorker\('app-url-config'/.test(server) && !/collection\('system'\)\.doc\('config'\)\.set\(/.test(server.replace(/registerWorker\('app-url-config'[\s\S]*?\n    \}\);\n/, '')) ? ok('the startup write to system/config happens only inside the gated app-url-config worker') : bad('system/config is written outside the gated worker');
// every file that creates timers/listeners must be a known, reviewed background process
const KNOWN_TIMER_FILES = new Set(['backend/chatThreadMigration.mjs', 'backend/credentialScrub.mjs', 'backend/deletionService.mjs', 'backend/messageNotifications.mjs', 'backend/notificationPushDispatch.ts', 'notificationPushDispatch.ts']);
const timerFiles = tracked.filter((f) => /\.(mjs|ts|js|cjs)$/.test(f) && !/^(src|scripts|android|ios|schoolix_flutter|functions|node_modules|dist)\//.test(f) && !/(^|\/)(server\.(mjs|ts|js))$|vite\.config|capacitor/.test(f)).filter((f) => { try { return /setInterval\(|\.onSnapshot\(|node-cron|cron\.schedule/.test(read(f)); } catch { return false; } });
const unknownTimers = timerFiles.filter((f) => !KNOWN_TIMER_FILES.has(f));
unknownTimers.length === 0 ? ok(`background timer/listener inventory is exactly the reviewed set (${timerFiles.length} files)`) : bad(`NEW background timer/listener file(s) not reviewed for environment gating: ${unknownTimers.join(', ')}`);
// scheduler endpoints
const internalRoutes = [...server.matchAll(/app\.(?:get|post)\('(\/api\/internal\/[^']+)'/g)].map((m) => m[1]);
const guardPos = server.indexOf('INTERNAL_ROUTE_RE.test(req.path)');
const firstRoutePos = Math.min(...internalRoutes.map((r) => server.indexOf(r)).filter((i) => i > 0), Infinity);
guardPos > 0 && guardPos < firstRoutePos ? ok(`all ${internalRoutes.length} /api/internal/* routes are registered after the environment guard`) : bad('the /api/internal guard is missing or registered after the routes');
for (const f of ['backend/dismissalRecoveryWorker.mjs', 'backend/dismissalCompactionWorker.mjs']) /\/api\/internal\//.test(readRepo(f)) ? ok(`${f} exposes only /api/internal/* (covered by the guard)`) : bad(`${f} exposes a route outside /api/internal`);
/deployment\.adminAllowed/.test(server) && /disabledAdminCredential/.test(server) ? ok('Admin initialisation is gated by the verified deployment (disabled credential otherwise)') : bad('Admin initialisation is not gated');
const cfgSrc = readRepo('src/lib/firebaseConfig.ts');
/previewBlocked/.test(cfgSrc) && /PRODUCTION_PROJECT_ID/.test(cfgSrc) && /preview-blocked/.test(cfgSrc) ? ok('the web client blocks preview hosts configured with the production project') : bad('web client preview block missing');
/previewBlocked/.test(readRepo('src/main.tsx')) ? ok('main.tsx renders the blocked notice instead of the app') : bad('main.tsx does not honour previewBlocked');
for (const f of ['src/lib/firebase.ts', 'src/lib/apiUtils.ts', 'src/lib/webPushService.ts']) /firebase-applet-config\.json/.test(readRepo(f)) ? bad(`${f} imports the committed (production) config directly, bypassing the preview guard`) : ok(`${f} uses the guarded config`);

// INFO
const cfg = JSON.parse(readRepo('firebase-applet-config.json'));
info(`committed web client config project: ${cfg.projectId} (public client identifiers; every deployment built from this branch, including previews, talks to this project)`);
info('Hostinger preview runtime variables cannot be read from the repository — preview Admin access is therefore treated as UNKNOWN and destructive operations stay disabled there');
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll preview-isolation checks passed');
process.exit(failures ? 1 : 0);
