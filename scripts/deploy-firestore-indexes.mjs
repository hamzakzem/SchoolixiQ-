/**
 * Create the composite indexes listed in firestore.indexes.json that do not exist yet
 * (Firestore Admin REST API, service-account credentials). Additive only: never deletes or
 * changes an index. Best effort: if the service account may not manage indexes, it prints the
 * manual command and exits 0 so the rules deployment is never blocked by it.
 *
 * Why it matters: the emulator never enforces indexes, but production refuses a query whose
 * composite index is missing — the listener fails and the screen (e.g. a chat thread or the
 * notification history) silently stays empty.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleAuth } from 'google-auth-library';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'firebase-applet-config.json'), 'utf8'));
const projectId = process.env.FIREBASE_PROJECT_ID || cfg.projectId;
const databaseId = process.env.FIRESTORE_DATABASE_ID || cfg.firestoreDatabaseId || '(default)';
const wanted = JSON.parse(fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8')).indexes || [];
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${encodeURIComponent(databaseId)}`;

const sig = (collectionGroup, fields) =>
  `${collectionGroup}|` + fields.filter((f) => f.fieldPath !== '__name__')
    .map((f) => `${f.fieldPath}:${f.order || f.arrayConfig}`).join(',');

try {
  const client = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/datastore'] }).getClient();
  const call = async (method, url, data) => (await client.request({ method, url, data, validateStatus: () => true }));

  const existing = new Set();
  for (const cg of [...new Set(wanted.map((i) => i.collectionGroup))]) {
    const r = await call('GET', `${base}/collectionGroups/${cg}/indexes`);
    if (r.status === 403) throw Object.assign(new Error('permission denied listing indexes'), { code: 403 });
    (r.data?.indexes || []).forEach((i) => existing.add(sig(cg, i.fields || [])));
  }

  let created = 0, present = 0, failed = 0;
  for (const i of wanted) {
    const s = sig(i.collectionGroup, i.fields);
    if (existing.has(s)) { present += 1; continue; }
    const r = await call('POST', `${base}/collectionGroups/${i.collectionGroup}/indexes`, { queryScope: i.queryScope || 'COLLECTION', fields: i.fields });
    if (r.status >= 200 && r.status < 300) { created += 1; console.log(`CREATING index: ${s}`); }
    else if (r.status === 409) { present += 1; }
    else { failed += 1; console.warn(`FAILED index ${s}: HTTP ${r.status} ${r.data?.error?.message || ''}`); }
  }
  console.log(`OK: indexes present=${present} creating=${created} failed=${failed} (building can take a few minutes)`);
} catch (e) {
  console.warn(`WARN: could not manage Firestore indexes automatically (${e.message}).`);
  console.warn('Run once with an authorised account:  firebase deploy --only firestore:indexes --project ' + projectId);
}
