/**
 * Guard for destructive operations (delete, restore, purge, void payment, financial review, school delete, cleanup sweep).
 *
 * PRINCIPLE: permission comes from the deployment IDENTITY (process environment, see runtimeEnv.mjs) — never from anything a
 * client sends. The request host is used only as an extra DENY layer: it can take a permission away, it can never grant one.
 *   allowed  =  identity allows production operations  AND  the Host header is a production host
 * A forged header can therefore at most make a request look like a production request, which grants nothing the identity did not
 * already grant; and a preview identity is refused whatever any header says.
 *
 * Only the `Host` header is read. `X-Forwarded-Host` / `Forwarded` / `X-Original-Host` are client-controllable unless the proxy
 * overwrites them (unproven for the hosting provider) and are deliberately ignored.
 */
import { PRODUCTION_HOST_RE, PREVIEW_HOST_RE } from './runtimeEnv.mjs';
export { PRODUCTION_HOST_RE, PREVIEW_HOST_RE };

/** Host the client addressed (Host header only), lower-case, without port. Never a forwarded-* header. */
export function requestHost(headers = {}, hostname = '') {
  const raw = String(headers.host || hostname || '').split(',')[0].trim().toLowerCase();
  return raw.replace(/:\d+$/, '');
}

/** Identity-only decision shared by requests and background sweeps. */
function identityAllowsProductionOps(deployment, env) {
  if (!deployment) return { allowed: false, reason: 'NO_DEPLOYMENT_IDENTITY' };
  if (deployment.kind === 'emulator') return { allowed: true, reason: 'emulator' };
  if (String(env.DELETION_DISABLED || '').toLowerCase() === 'true') return { allowed: false, reason: 'DELETION_DISABLED' };
  if (deployment.kind !== 'production') return { allowed: false, reason: `DEPLOYMENT_${String(deployment.kind || 'unknown').toUpperCase()}` };
  if (!deployment.adminAllowed) return { allowed: false, reason: 'ADMIN_DISABLED' };
  if (!deployment.appUrlVerified) return { allowed: false, reason: 'APP_URL_NOT_PRODUCTION' };
  return { allowed: true, reason: 'verified_production' };
}

/**
 * Request-scoped destructive operations. `deployment` = result of resolveDeployment(); `host` = requestHost(headers).
 * The host can only deny.
 */
export function destructiveOpsAllowed({ host = '', deployment = null, env = process.env } = {}) {
  const id = identityAllowsProductionOps(deployment, env);
  if (!id.allowed) return id;
  if (deployment.kind === 'emulator') return id; // emulators cannot reach production data whatever the host says
  if (PREVIEW_HOST_RE.test(host)) return { allowed: false, reason: 'PREVIEW_HOST' };
  if (!PRODUCTION_HOST_RE.test(host)) return { allowed: false, reason: 'HOST_NOT_PRODUCTION' };
  return id;
}

/** Background destructive work (trash purge, job resume): identity only — there is no request, so no host. */
export function backgroundDestructiveAllowed(deployment, env = process.env) {
  return identityAllowsProductionOps(deployment, env).allowed;
}

/**
 * Cron / scheduler endpoints: identity decides (see runtimeEnv.workersAllowedNow). The only request-derived rule is an extra
 * deny for hosts that are known preview domains; local callers (cron jobs calling localhost) stay possible.
 */
export function internalRouteHostDenied(host) {
  return PREVIEW_HOST_RE.test(host);
}

/** Routes whose execution deletes, restores, cancels or purges data. */
export const DESTRUCTIVE_ROUTE_RE = /^\/api\/(records\/|admin\/(delete-user|delete-student|delete-school|schools\/[^/]+\/permanent-delete|messages\/(permanent-delete|purge-user-conversations)|distributors\/[^/]+\/delete|plans\/[^/]+\/delete))/;
