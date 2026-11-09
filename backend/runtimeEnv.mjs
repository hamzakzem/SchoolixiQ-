/**
 * Deployment identity + Firebase project verification for the Node backend (production vs preview vs emulator).
 *
 * Problem this solves: a Hostinger *preview* is built from the same repository, whose committed config names the production
 * Firebase project, and it may inherit the production site's environment variables. Anything that touches Firebase with Admin
 * privileges (workers, cron endpoints, startup writes) must therefore know — and be able to prove — where it runs.
 *
 * Rules (fail closed):
 *  - production  = DEPLOY_ENV=production AND NODE_ENV=production AND (no Admin credentials, or credentials of the production project)
 *  - preview     = DEPLOY_ENV in {preview, staging, development, dev, test}
 *  - emulator    = FIRESTORE_EMULATOR_HOST present (cannot reach production data)
 *  - unknown     = anything else (DEPLOY_ENV missing/ambiguous, or DEPLOY_ENV=production with another project's credentials)
 *  - Admin credentials are used only when: emulator, production, or preview whose credentials belong to a project that is NOT
 *    the production project. In every other case they are IGNORED and Admin is initialised with a credential that always fails.
 *  - Background work (listeners, sweeps, startup writes, /api/internal/* cron) runs only when: emulator, preview on a verified
 *    non-production project, or production AFTER a request on a production host was observed (inherited-variable defence).
 * The project id of Admin credentials is taken from the service-account e-mail (name@PROJECT.iam.gserviceaccount.com); an
 * explicit FIREBASE_PROJECT_ID that disagrees with it makes the credentials unverifiable.
 */
export const PRODUCTION_FIREBASE_PROJECT_ID = 'yala-safari-iq';
export const PRODUCTION_HOST_RE = /(^|\.)schoolixiq\.(com|iq)$/i;
const NON_PROD_ENVS = ['preview', 'staging', 'development', 'dev', 'test'];

const SA_EMAIL_RE = /^[^@\s]+@([a-z0-9-]+)\.iam\.gserviceaccount\.com$/i;

/** Project id embedded in a service-account e-mail, or ''. */
export function projectFromServiceAccountEmail(email) {
  const m = SA_EMAIL_RE.exec(String(email || '').trim());
  return m ? m[1].toLowerCase() : '';
}

/**
 * @param {{env?: Record<string,string|undefined>, clientEmail?: string, explicitProjectId?: string, hasPrivateKey?: boolean}} p
 */
export function resolveDeployment({ env = process.env, clientEmail = '', explicitProjectId = '', hasPrivateKey = false } = {}) {
  const emailProject = projectFromServiceAccountEmail(clientEmail);
  const explicit = String(explicitProjectId || '').trim().toLowerCase();
  const hasCreds = Boolean(clientEmail && hasPrivateKey);
  const problems = [];
  let adminProjectId = '';
  if (hasCreds) {
    if (!emailProject) problems.push('FIREBASE_CLIENT_EMAIL is not a service-account e-mail: project cannot be verified');
    else if (explicit && explicit !== emailProject) problems.push('FIREBASE_PROJECT_ID does not match the project of FIREBASE_CLIENT_EMAIL');
    else adminProjectId = emailProject;
  }
  const targetsProduction = adminProjectId === PRODUCTION_FIREBASE_PROJECT_ID;
  const declared = String(env.DEPLOY_ENV || '').trim().toLowerCase();

  let kind = 'unknown';
  let reason = 'DEPLOY_ENV is not set to a known value';
  if (env.FIRESTORE_EMULATOR_HOST) { kind = 'emulator'; reason = 'Firebase emulator'; }
  else if (NON_PROD_ENVS.includes(declared)) { kind = 'preview'; reason = `DEPLOY_ENV=${declared}`; }
  else if (declared === 'production') {
    if (env.NODE_ENV !== 'production') reason = 'DEPLOY_ENV=production requires NODE_ENV=production';
    else if (hasCreds && !targetsProduction) reason = 'DEPLOY_ENV=production but the Admin credentials belong to another project';
    else if (problems.length) reason = problems[0];
    else { kind = 'production'; reason = 'DEPLOY_ENV=production'; }
  } else if (declared) reason = `unrecognised DEPLOY_ENV "${declared}"`;

  // Admin credentials may be used only where they cannot touch production data from a non-production deployment
  let adminAllowed = false;
  let adminReason = '';
  if (kind === 'emulator') { adminAllowed = true; adminReason = 'emulator'; }
  else if (kind === 'production') { adminAllowed = true; adminReason = 'verified production'; }
  else if (kind === 'preview') {
    if (!hasCreds) { adminAllowed = false; adminReason = 'preview without Admin credentials'; }
    else if (!adminProjectId) { adminAllowed = false; adminReason = problems[0] || 'credentials unverifiable'; }
    else if (targetsProduction) { adminAllowed = false; adminReason = 'preview holds PRODUCTION Admin credentials: ignored'; }
    else { adminAllowed = true; adminReason = `preview on separate project ${adminProjectId}`; }
  } else { adminAllowed = false; adminReason = hasCreds ? `Admin credentials ignored: ${reason}` : reason; }
  // production with no credentials at all behaves exactly as before (default credentials / none)
  if (kind === 'production' && !hasCreds) adminReason = 'production without explicit credentials';

  let workers; // when may background work start?
  if (kind === 'emulator') workers = 'now';
  else if (kind === 'preview') workers = adminAllowed ? 'now' : 'never';
  else if (kind === 'production') workers = 'after_production_host';
  else workers = 'never';

  return { kind, reason, adminProjectId, targetsProduction, hasCreds, adminAllowed, adminReason, workers, problems };
}

// ── observed traffic (inherited-variable defence) ────────────────────────────
let productionHostSeen = false;
export function noteProductionHost(host) { if (PRODUCTION_HOST_RE.test(String(host || ''))) { const first = !productionHostSeen; productionHostSeen = true; return first; } return false; }
export const _resetForTests = () => { productionHostSeen = false; started.clear(); pending.length = 0; };

export function workersAllowedNow(decision) {
  if (decision.workers === 'now') return true;
  if (decision.workers === 'after_production_host') return productionHostSeen;
  return false;
}

// ── worker registry: nothing background starts unless the environment allows it ─────────────
const pending = [];
const started = new Set();
let _decision = null;
let _log = console;
export function configureWorkers(decision, log = console) { _decision = decision; _log = log; }

/** Register a background process. It is started immediately if allowed, otherwise as soon as the environment is proven. */
export function registerWorker(name, start) {
  pending.push({ name, start });
  tryStartWorkers();
}
export function tryStartWorkers() {
  if (!_decision || !workersAllowedNow(_decision)) return [];
  const ran = [];
  for (const w of pending.splice(0)) {
    if (started.has(w.name)) continue;
    started.add(w.name);
    try { w.start(); ran.push(w.name); } catch (e) { _log.error?.(`[env] worker ${w.name} failed to start`, e?.message); }
  }
  return ran;
}
export function workerStatus() {
  return { started: [...started], waiting: pending.map((w) => w.name), mode: _decision?.workers ?? 'unconfigured', allowedNow: _decision ? workersAllowedNow(_decision) : false };
}

/** Credential object that makes every Admin call fail loudly (never a silent fallback to production). */
export const disabledAdminCredential = (why) => ({
  getAccessToken: async () => { throw Object.assign(new Error(`ADMIN_DISABLED: ${why}`), { code: 'ADMIN_DISABLED' }); },
});

/** Paths served only to cron / schedulers or that start background effects. */
export const INTERNAL_ROUTE_RE = /^\/api\/internal\//;

/**
 * What the startup APP_URL registration may write to Firestore `system/config`.
 * Only a verified production deployment on a production host writes the production URL; everything else writes the dev field or nothing.
 */
export function appUrlConfigFields({ kind, appUrl }) {
  const clean = String(appUrl || '').replace(/\/$/, '');
  let host = '';
  try { host = new URL(clean).hostname.toLowerCase(); } catch { return { fields: null, reason: 'invalid APP_URL' }; }
  const isDevUrl = clean.includes('-dev-') || clean.includes('localhost') || clean.includes('127.0.0.1');
  if (kind === 'production' && PRODUCTION_HOST_RE.test(host) && !isDevUrl) return { fields: { appUrl: clean, appUrlProd: clean }, reason: 'production host' };
  if (kind === 'unknown') return { fields: null, reason: 'unverified environment' };
  return { fields: { appUrlDev: clean }, reason: kind === 'production' ? 'APP_URL is not a production host: dev field only' : 'non-production deployment' };
}
