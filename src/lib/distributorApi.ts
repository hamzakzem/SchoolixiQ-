import { auth } from './firebase';
import { ensureBackendApiBaseUrl, getApiUrl } from './apiUtils';

async function distributorFetch(path: string, init?: RequestInit) {
  await ensureBackendApiBaseUrl();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('No auth token available');

  const url = getApiUrl(path);
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text };
  }

  if (!response.ok) {
    throw new Error(String(body.message || body.error || `Request failed (${response.status})`));
  }
  return body;
}

export async function fetchDistributorDashboard() {
  return distributorFetch('/api/distributor/dashboard');
}

export async function fetchDistributorSchools() {
  return distributorFetch('/api/distributor/schools');
}

export async function fetchDistributorCommissions(params?: {
  monthKey?: string;
  status?: string;
  schoolId?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.monthKey) qs.set('monthKey', params.monthKey);
  if (params?.status) qs.set('status', params.status);
  if (params?.schoolId) qs.set('schoolId', params.schoolId);
  const query = qs.toString();
  return distributorFetch(`/api/distributor/commissions${query ? `?${query}` : ''}`);
}
