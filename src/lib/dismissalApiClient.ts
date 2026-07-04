import { auth } from './firebase';
import { ensureBackendApiBaseUrl, getApiUrl } from './apiUtils';

const pendingKeys = new Map<string, string>();

function stableKey(scope: string, requestId: string) {
  const cacheKey = `${scope}:${requestId}`;
  if (!pendingKeys.has(cacheKey)) {
    pendingKeys.set(cacheKey, newIdempotencyKey(scope, requestId));
  }
  return pendingKeys.get(cacheKey)!;
}

function clearStableKey(scope: string, requestId: string) {
  pendingKeys.delete(`${scope}:${requestId}`);
}

async function dismissalFetch(
  endpoint: string,
  options: RequestInit & { method?: string } = {},
): Promise<Response> {
  await ensureBackendApiBaseUrl();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('يرجى تسجيل الدخول أولاً');

  const url = getApiUrl(endpoint);
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

async function parseJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'فشل طلب التسريح');
  }
  return data;
}

export async function apiCreateDismissalRequest(body: Record<string, unknown>) {
  const idempotencyKey =
    (body.idempotencyKey as string) || newIdempotencyKey('create', String(body.studentId || ''));
  const res = await dismissalFetch('/api/dismissal/request', {
    method: 'POST',
    body: JSON.stringify({ ...body, idempotencyKey }),
  });
  return parseJson(res) as { id: string; token: string; status: string };
}

export async function apiGuardVerifyDismissal(requestId: string, note?: string) {
  const idempotencyKey = stableKey('guard-verify', requestId);
  const res = await dismissalFetch('/api/dismissal/guard-verify', {
    method: 'POST',
    body: JSON.stringify({ requestId, note, idempotencyKey }),
  });
  const data = await parseJson(res);
  clearStableKey('guard-verify', requestId);
  return data;
}

export async function apiGuardRejectDismissal(requestId: string, reason: string) {
  const idempotencyKey = stableKey('guard-reject', requestId);
  const res = await dismissalFetch('/api/dismissal/guard-reject', {
    method: 'POST',
    body: JSON.stringify({ requestId, reason, idempotencyKey }),
  });
  const data = await parseJson(res);
  clearStableKey('guard-reject', requestId);
  return data;
}

export async function apiManagerApproveDismissal(requestId: string) {
  const idempotencyKey = stableKey('manager-approve', requestId);
  const res = await dismissalFetch('/api/dismissal/manager-approve', {
    method: 'POST',
    body: JSON.stringify({ requestId, idempotencyKey }),
  });
  const data = await parseJson(res);
  clearStableKey('manager-approve', requestId);
  return data;
}

export async function apiManagerRejectDismissal(requestId: string, reason: string) {
  const idempotencyKey = stableKey('manager-reject', requestId);
  const res = await dismissalFetch('/api/dismissal/manager-reject', {
    method: 'POST',
    body: JSON.stringify({ requestId, reason, idempotencyKey }),
  });
  const data = await parseJson(res);
  clearStableKey('manager-reject', requestId);
  return data;
}

/** Stable key for retry — call once per user action, reuse on retry */
export function createDismissalIdempotencyKey(action: string, requestId: string) {
  return newIdempotencyKey(action, requestId);
}
