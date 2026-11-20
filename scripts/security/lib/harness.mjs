// Security regression harness (Phase 0). Local Firebase Emulator Suite ONLY.
//
// Safety guarantees enforced here, before any request is sent:
//   * the project id must start with "demo-" (the emulators never contact Google for demo projects);
//   * Firestore / Auth hosts must be loopback emulator addresses;
//   * no service-account credentials may be present in the environment.
// Tests talk to Firestore through its REST API with emulator-accepted unsigned ID tokens, so every
// request is evaluated by the repository's firestore.rules exactly like a real client request.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const PROJECT_ID = process.env.SECURITY_TEST_PROJECT || 'demo-schoolixiq-security';
export const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085';
export const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

function assertSafeEnvironment() {
  if (!PROJECT_ID.startsWith('demo-')) {
    throw new Error(`Refusing to run: project id "${PROJECT_ID}" is not a demo- project.`);
  }
  for (const [name, host] of [['FIRESTORE_EMULATOR_HOST', FIRESTORE_HOST], ['FIREBASE_AUTH_EMULATOR_HOST', AUTH_HOST]]) {
    if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host)) {
      throw new Error(`Refusing to run: ${name}=${host} is not a loopback emulator address.`);
    }
  }
  for (const v of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_SERVICE_ACCOUNT']) {
    if (process.env[v]) throw new Error(`Refusing to run: ${v} is set. Unset all real credentials first.`);
  }
}
assertSafeEnvironment();

process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_HOST;
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_HOST;
process.env.GCLOUD_PROJECT = PROJECT_ID;
// Stop google-auth-library from probing the GCE metadata server.
process.env.METADATA_SERVER_DETECTION = 'none';

const adminSdk = require('firebase-admin');
export const admin = adminSdk;
if (!adminSdk.apps.length) adminSdk.initializeApp({ projectId: PROJECT_ID });
/** Rules-bypassing handle for seeding and for reading state back. Emulator only. */
export const adminDb = adminSdk.firestore();
export const adminAuth = adminSdk.auth();

const FS_ROOT = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

export async function emulatorsReachable() {
  try {
    const [f, a] = await Promise.all([
      fetch(`http://${FIRESTORE_HOST}/`, { signal: AbortSignal.timeout(3000) }),
      fetch(`http://${AUTH_HOST}/`, { signal: AbortSignal.timeout(3000) }),
    ]);
    return f.ok && a.status < 500;
  } catch {
    return false;
  }
}

export async function resetEmulators() {
  const r1 = await fetch(`http://${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
  const r2 = await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
  assert.ok(r1.ok && r2.ok, 'emulator reset failed');
}

// ---------------------------------------------------------------------------------------------
// Identities: unsigned ID tokens (accepted by the Firestore emulator only).
// ---------------------------------------------------------------------------------------------
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

/**
 * @param {{uid: string, email?: string|null, emailVerified?: boolean, claims?: object, provider?: string}} who
 */
export function idToken({ uid, email = null, emailVerified = false, claims = {}, provider = 'password' }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    auth_time: now,
    iat: now,
    exp: now + 3600,
    sub: uid,
    user_id: uid,
    firebase: { sign_in_provider: provider, identities: email ? { email: [email] } : {} },
    ...(email !== null ? { email, email_verified: emailVerified } : {}),
    ...claims,
  };
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(payload)}.`;
}

// ---------------------------------------------------------------------------------------------
// Firestore REST encoding
// ---------------------------------------------------------------------------------------------
export const serverTimestamp = Symbol('serverTimestamp');

export function encodeValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === 'object') return { mapValue: { fields: encodeFields(v) } };
  throw new Error(`cannot encode ${typeof v}`);
}
export function encodeFields(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== serverTimestamp).map(([k, v]) => [k, encodeValue(v)]));
}
function decodeValue(v) {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decodeValue(x)]));
  if ('referenceValue' in v) return v.referenceValue;
  return v;
}
export const decodeDoc = (d) => Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, decodeValue(v)]));

const headers = (token) => ({ 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });
const docName = (path) => `projects/${PROJECT_ID}/databases/(default)/documents/${path}`;

async function call(method, url, token, body) {
  const r = await fetch(url, { method, headers: headers(token), body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await r.json(); } catch { /* empty body */ }
  return { status: r.status, json };
}

/** Client get. */
export const clientGet = (token, path) => call('GET', `${FS_ROOT}/${path}`, token);

/** Client create (fails if the document exists, like addDoc / a create rule). */
export const clientCreate = (token, path, data) =>
  call('PATCH', `${FS_ROOT}/${path}?currentDocument.exists=false`, token, { fields: encodeFields(data) });

/** Client full overwrite (setDoc without merge). */
export const clientSet = (token, path, data) => call('PATCH', `${FS_ROOT}/${path}`, token, { fields: encodeFields(data) });

/** Client partial update (updateDoc): only the listed fields change. */
export function clientUpdate(token, path, data) {
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  return call('PATCH', `${FS_ROOT}/${path}?${mask}&currentDocument.exists=true`, token, { fields: encodeFields(data) });
}

/** Client updateDoc with arrayUnion on one field, exactly like the app's link flows. */
export function clientArrayUnion(token, path, field, values, extra = {}) {
  const writes = [{
    update: { name: docName(path), fields: encodeFields(extra) },
    updateMask: { fieldPaths: Object.keys(extra) },
    updateTransforms: [{ fieldPath: field, appendMissingElements: { values: values.map(encodeValue) } }],
    currentDocument: { exists: true },
  }];
  return call('POST', `${FS_ROOT}:commit`, token, { writes });
}

export const clientDelete = (token, path) => call('DELETE', `${FS_ROOT}/${path}`, token);

/** Client structured query on a top-level collection. */
export async function clientQuery(token, collectionId, { where = [], limit } = {}) {
  const filters = where.map(([field, op, value]) => ({ fieldFilter: { field: { fieldPath: field }, op, value: encodeValue(value) } }));
  const structuredQuery = { from: [{ collectionId }] };
  if (filters.length === 1) structuredQuery.where = filters[0];
  if (filters.length > 1) structuredQuery.where = { compositeFilter: { op: 'AND', filters } };
  if (limit) structuredQuery.limit = limit;
  const r = await call('POST', `${FS_ROOT}:runQuery`, token, { structuredQuery });
  const docs = Array.isArray(r.json) ? r.json.filter((x) => x.document).map((x) => ({ id: x.document.name.split('/').pop(), ...decodeDoc(x.document) })) : null;
  return { status: r.status, docs };
}

// ---------------------------------------------------------------------------------------------
// Assertions. Each one states the SECURE expectation; a failure is a proven weakness.
// ---------------------------------------------------------------------------------------------
const ALLOWED = (s) => s === 200;
const DENIED = (s) => s === 403 || s === 401;

export function expectDenied(res, what) {
  assert.ok(
    DENIED(res.status),
    `SECURITY EXPECTATION VIOLATED — ${what} should be DENIED but the emulator returned HTTP ${res.status} (ALLOWED).`,
  );
}
export function expectAllowed(res, what) {
  assert.ok(
    ALLOWED(res.status),
    `LEGITIMATE FLOW BROKEN — ${what} should be ALLOWED but returned HTTP ${res.status}: ${JSON.stringify(res.json?.error?.message || res.json || '').slice(0, 200)}`,
  );
}

export async function readDoc(path) {
  const s = await adminDb.doc(path).get();
  return s.exists ? s.data() : null;
}
