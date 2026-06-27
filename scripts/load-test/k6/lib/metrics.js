import { Counter, Rate, Trend } from 'k6/metrics';

export const authFailures = new Counter('auth_failures');
export const firestorePermissionDenied = new Counter('firestore_permission_denied');
export const firestoreResourceExhausted = new Counter('firestore_resource_exhausted');
export const firestoreIndexRequired = new Counter('firestore_index_required');
export const firestoreFailures = new Counter('firestore_rest_failures');
export const pageLoadFailures = new Counter('page_load_failures');

export const readDuration = new Trend('read_duration', true);
export const writeDuration = new Trend('write_duration', true);

export const errorRate = new Rate('errors');

export const DEFAULT_THRESHOLDS = {
  http_req_failed: ['rate<0.01'],
  errors: ['rate<0.01'],
  read_duration: ['p(95)<2500'],
  write_duration: ['p(95)<3500'],
  auth_failures: ['count==0'],
  firestore_permission_denied: ['count==0'],
  firestore_resource_exhausted: ['count==0'],
  firestore_index_required: ['count==0'],
};

export function recordHttpResult(res, { type = 'read' } = {}) {
  const ok = res.status >= 200 && res.status < 400;
  errorRate.add(!ok);
  if (type === 'write') writeDuration.add(res.timings.duration);
  else readDuration.add(res.timings.duration);
  return ok;
}

export function parseFirestoreError(body) {
  if (!body) return null;
  try {
    const json = typeof body === 'string' ? JSON.parse(body) : body;
    const status = json.error?.status || '';
    const message = json.error?.message || '';
    return { status, message };
  } catch {
    return null;
  }
}

export function trackFirestoreResponse(res) {
  if (res.status >= 200 && res.status < 300) return true;

  firestoreFailures.add(1);
  errorRate.add(1);

  const err = parseFirestoreError(res.body);
  if (!err) return false;

  const combined = `${err.status} ${err.message}`.toLowerCase();
  if (combined.includes('permission_denied') || combined.includes('permission denied')) {
    firestorePermissionDenied.add(1);
  }
  if (combined.includes('resource_exhausted') || combined.includes('quota')) {
    firestoreResourceExhausted.add(1);
  }
  if (combined.includes('failed_precondition') && combined.includes('index')) {
    firestoreIndexRequired.add(1);
  }
  return false;
}
