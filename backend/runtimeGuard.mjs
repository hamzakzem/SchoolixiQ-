/**
 * Runtime guard for destructive operations (delete, restore, purge, void payment, financial review, school delete, cleanup sweep).
 *
 * Why: the committed Firebase client config points at the production project (yala-safari-iq) and a Hostinger/other preview that
 * inherits the site's environment variables could also hold production Admin credentials. Isolation of a preview cannot be proven
 * from the repository, so destructive operations FAIL CLOSED unless the request is served from a known production host
 * (schoolixiq.com / schoolixiq.iq) or the process is running against the Firebase emulators.
 */
export const PRODUCTION_HOST_RE = /(^|\.)schoolixiq\.(com|iq)$/i;
export const PREVIEW_HOST_RE = /\.(hostingersite\.com|pages\.dev|netlify\.app|vercel\.app|web\.app|firebaseapp\.com|run\.app|onrender\.com|herokuapp\.com)$/i;
const NON_PROD_ENVS = ['preview', 'staging', 'development', 'dev', 'test'];

/** Host the client used (first x-forwarded-host value, else Host), lower-case, without port. */
export function requestHost(headers = {}, hostname = '') {
  const raw = String(headers['x-forwarded-host'] || headers.host || hostname || '').split(',')[0].trim().toLowerCase();
  return raw.replace(/:\d+$/, '');
}

export function destructiveOpsAllowed({ host, env = process.env }) {
  // Firebase emulators cannot reach production data, whatever the host name is.
  if (env.FIRESTORE_EMULATOR_HOST) return { allowed: true, reason: 'emulator' };
  if (String(env.DELETION_DISABLED || '').toLowerCase() === 'true') return { allowed: false, reason: 'DELETION_DISABLED' };
  if (NON_PROD_ENVS.includes(String(env.DEPLOY_ENV || '').toLowerCase())) return { allowed: false, reason: 'DEPLOY_ENV' };
  if (PREVIEW_HOST_RE.test(host)) return { allowed: false, reason: 'PREVIEW_HOST' };
  if (!PRODUCTION_HOST_RE.test(host)) return { allowed: false, reason: 'UNKNOWN_HOST' };
  return { allowed: true, reason: 'production_host' };
}

let productionHostSeen = false;
let previewHostSeen = false;
/** Called for every request: lets background cleanup (no request context) know where this process is really served. */
export function noteServedHost(host, env = process.env) {
  if (PRODUCTION_HOST_RE.test(host) && !PREVIEW_HOST_RE.test(host)) productionHostSeen = true;
  else if (PREVIEW_HOST_RE.test(host)) previewHostSeen = true;
}
/** Background sweeps (purge expired trash, resume jobs) only run on a process that is provably serving production, or on emulators. */
export function backgroundDestructiveAllowed(env = process.env) {
  if (env.FIRESTORE_EMULATOR_HOST) return true;
  if (String(env.DELETION_DISABLED || '').toLowerCase() === 'true') return false;
  if (NON_PROD_ENVS.includes(String(env.DEPLOY_ENV || '').toLowerCase())) return false;
  return productionHostSeen && !previewHostSeen;
}
export const _resetForTests = () => { productionHostSeen = false; previewHostSeen = false; };

/** Routes whose execution deletes, restores, cancels or purges data. */
export const DESTRUCTIVE_ROUTE_RE = /^\/api\/(records\/|admin\/(delete-user|delete-student|delete-school|schools\/[^/]+\/permanent-delete|messages\/(permanent-delete|purge-user-conversations)|distributors\/[^/]+\/delete|plans\/[^/]+\/delete))/;
