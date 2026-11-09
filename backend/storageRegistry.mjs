/**
 * Storage Cleanup Registry — which Firebase Storage objects belong to which record, and how to move
 * them to the trash, bring them back, or remove them for good.
 *
 * Real object locations in this project (see /api/upload and storage.rules):
 *   students/{schoolId}/{studentId}/photo_*.ext          student photos (also legacy students/{studentId}/…)
 *   schools/{schoolId}/store/products/{ts}-{name}        product images (referenced by market.imageUrl)
 *   schools/{schoolId}/logo|idcards/…                    school level, removed with the school
 *   users/{uid}/…                                         account files (avatars)
 *   market/{itemId}/…                                     legacy product images
 * Records point at files through URL fields, so every record is scanned for Storage URLs instead of
 * assuming a folder layout; fixed prefixes are only used for folders that are exclusively one record's.
 *
 * Rules enforced here (the Admin SDK bypasses storage.rules, so they live in code):
 *  - a file is only touched when its path is inside the record's own scope (school / record / account);
 *  - a file still referenced by another live record is left alone ("shared");
 *  - files are MOVED to `_trash/{bundleId}/…` (restorable, download token kept) and deleted only on purge;
 *  - every file outcome is stored on the bundle (`files` subcollection) and counted in the log.
 */

export const TRASH_ROOT = '_trash';

/** Fields (collection → [field, isArray]) that may hold a file reference; used for the "shared" check. */
export const FILE_REF_FIELDS = {
  students: [['photoUrl'], ['photo'], ['avatar'], ['idCardUrl']],
  users: [['photoUrl'], ['photoURL'], ['avatar']],
  market: [['imageUrl'], ['image'], ['images', true]],
  marketplace: [['imageUrl'], ['image'], ['images', true]],
  inventory: [['imageUrl'], ['image']],
  homework: [['attachmentUrl'], ['fileUrl'], ['imageUrl'], ['attachments', true]],
  announcements: [['imageUrl'], ['attachmentUrl'], ['fileUrl'], ['attachments', true]],
  teacher_reports: [['attachmentUrl'], ['fileUrl']],
  advanced_reports: [['attachmentUrl'], ['fileUrl']],
  behavior_reports: [['attachmentUrl'], ['fileUrl']],
  id_cards: [['photoUrl'], ['imageUrl']],
  student_archives: [['fileUrl'], ['attachmentUrl'], ['photoUrl']],
  orders: [['imageUrl']],
};

/** Folders that belong exclusively to one record. */
export function exclusivePrefixes(collection, id, schoolId) {
  if (collection === 'students') return [`students/${schoolId}/${id}/`, `students/${id}/`];
  if (collection === 'market' || collection === 'marketplace') return [`market/${id}/`];
  if (collection === 'users') return [`users/${id}/`];
  return [];
}

/** Path prefixes a record of this school may legitimately own. */
export function allowedScopes({ schoolId, collection, recordId }) {
  const scopes = [];
  if (schoolId) scopes.push(`schools/${schoolId}/`, `students/${schoolId}/`);
  if (collection === 'students') scopes.push(`students/${recordId}/`);
  if (collection === 'market' || collection === 'marketplace') scopes.push(`market/${recordId}/`);
  if (collection === 'users') scopes.push(`users/${recordId}/`);
  return scopes;
}

/** Object path from a Firebase download URL / gs:// / storage.googleapis URL / emulator URL; null if not one of ours. */
export function pathFromUrl(value, bucketName) {
  if (typeof value !== 'string' || value.length < 8 || value.startsWith('data:')) return null;
  let m = /^gs:\/\/([^/]+)\/(.+)$/.exec(value);
  if (m) return m[1] === bucketName ? decodeURIComponent(m[2]) : null;
  m = /^https?:\/\/[^/]+\/v0\/b\/([^/]+)\/o\/([^?#]+)/.exec(value);
  if (m) return m[1] === bucketName ? decodeURIComponent(m[2]) : null;
  m = /^https:\/\/storage\.googleapis\.com\/([^/]+)\/([^?#]+)/.exec(value);
  if (m) return m[1] === bucketName ? decodeURIComponent(m[2]) : null;
  return null;
}

/** Every Storage path referenced anywhere inside a (nested) document. */
export function extractStoragePaths(data, bucketName, out = new Set(), depth = 0) {
  if (data == null || depth > 4) return out;
  if (typeof data === 'string') { const p = pathFromUrl(data, bucketName); if (p) out.add(p); return out; }
  if (Array.isArray(data)) { data.forEach((v) => extractStoragePaths(v, bucketName, out, depth + 1)); return out; }
  if (typeof data === 'object') Object.values(data).forEach((v) => extractStoragePaths(v, bucketName, out, depth + 1));
  return out;
}

const inScope = (path, scopes) => scopes.some((s) => path.startsWith(s));

/** path -> "collection/id" of the first live record in the school that references it (one scan per collection). */
async function buildReferenceIndex(db, bucketName, schoolId) {
  const index = new Map();
  for (const [col, fields] of Object.entries(FILE_REF_FIELDS)) {
    let q = db.collection(col);
    if (schoolId) q = q.where('schoolId', '==', schoolId);
    const snap = await q.select(...fields.map(([f]) => f)).get();
    for (const d of snap.docs) {
      for (const [field] of fields) {
        for (const p of extractStoragePaths(d.get(field), bucketName)) if (!index.has(p)) index.set(p, `${col}/${d.id}`);
      }
    }
  }
  return index;
}

/**
 * Plan: which files belong to the records of a bundle. `records` = [{collection,id,data}] (main + dependants).
 * Returns [{path, status}] where status is 'move' | 'shared' | 'out_of_scope'.
 */
export async function planFiles(ctx, { schoolId, collection, recordId, records }) {
  const bucket = ctx.bucket();
  const bucketName = bucket.name;
  const scopes = allowedScopes({ schoolId, collection, recordId });
  const found = new Map(); // path -> owner key
  for (const r of records) {
    for (const p of extractStoragePaths(r.data, bucketName)) if (!found.has(p)) found.set(p, `${r.collection}/${r.id}`);
  }
  // exclusive folders (may hold files no field points to)
  for (const r of records) {
    for (const prefix of exclusivePrefixes(r.collection, r.id, schoolId)) {
      if (!inScope(prefix, scopes)) continue;
      const [files] = await bucket.getFiles({ prefix });
      for (const f of files) if (!found.has(f.name)) found.set(f.name, `${r.collection}/${r.id}`);
    }
  }
  const plan = [];
  const refIndex = found.size ? await buildReferenceIndex(ctx.db, bucketName, schoolId) : new Map();
  for (const [path, owner] of found) {
    if (!inScope(path, scopes)) { plan.push({ path, owner, status: 'out_of_scope' }); continue; }
    const shared = refIndex.get(path) || null;
    plan.push(shared ? { path, owner, status: 'shared', sharedWith: shared } : { path, owner, status: 'move' });
  }
  return plan;
}

const trashPathOf = (bundleId, path) => `${TRASH_ROOT}/${bundleId}/${path}`;

/** Move planned files into the trash. Idempotent: a file already moved (or already gone) is fine. */
export async function moveFilesToTrash(ctx, bundleRef, bundleId, plan) {
  const bucket = ctx.bucket();
  let failed = 0;
  for (const item of plan) {
    const key = Buffer.from(item.path).toString('base64url').slice(0, 200);
    const fref = bundleRef.collection('files').doc(key);
    if (item.status !== 'move') { await fref.set({ ...item, trashPath: null }, { merge: true }); continue; }
    const existing = await fref.get();
    if (existing.exists && existing.get('status') === 'trashed') continue;
    const trashPath = trashPathOf(bundleId, item.path);
    try {
      if (ctx.faults?.fileTrash && String(item.path).includes(ctx.faults.fileTrash)) throw new Error('injected file move fault');
      const src = bucket.file(item.path);
      const [srcExists] = await src.exists();
      if (!srcExists) {
        const [dstExists] = await bucket.file(trashPath).exists();
        await fref.set({ ...item, trashPath, status: dstExists ? 'trashed' : 'missing', error: null }, { merge: true });
        continue;
      }
      await src.move(trashPath);
      await fref.set({ ...item, trashPath, status: 'trashed', error: null }, { merge: true });
    } catch (e) {
      failed += 1;
      await fref.set({ ...item, trashPath, status: 'failed', error: String(e?.message || e).slice(0, 200), attempts: (existing.get?.('attempts') || 0) + 1 }, { merge: true });
    }
  }
  return { failed };
}

/** Bring every trashed file back to its original path. Returns counts; any failure must block "full restore". */
export async function restoreFilesFromTrash(ctx, bundleRef) {
  const bucket = ctx.bucket();
  const snap = await bundleRef.collection('files').get();
  let restored = 0, failed = 0, missing = 0;
  for (const d of snap.docs) {
    const f = d.data();
    if (f.status === 'restored' || f.status === 'shared' || f.status === 'out_of_scope') continue;
    if (f.status === 'missing') { missing += 1; continue; }
    try {
      if (ctx.faults?.fileRestore && String(f.path).includes(ctx.faults.fileRestore)) throw new Error('injected file restore fault');
      const trash = bucket.file(f.trashPath);
      const [tExists] = await trash.exists();
      if (!tExists) {
        const [oExists] = await bucket.file(f.path).exists();
        if (oExists) { await d.ref.set({ status: 'restored' }, { merge: true }); restored += 1; continue; }
        throw new Error('trashed file not found');
      }
      await trash.move(f.path);
      await d.ref.set({ status: 'restored', error: null }, { merge: true });
      restored += 1;
    } catch (e) {
      failed += 1;
      await d.ref.set({ status: 'restore_failed', error: String(e?.message || e).slice(0, 200) }, { merge: true });
    }
  }
  return { restored, failed, missing };
}

/** Permanently remove the trashed copies (purge). Never touches anything outside `_trash/{bundleId}/`. */
export async function purgeTrashedFiles(ctx, bundleRef, bundleId) {
  const bucket = ctx.bucket();
  if (ctx.faults?.storage) throw new Error('injected storage fault');
  const [files] = await bucket.getFiles({ prefix: `${TRASH_ROOT}/${bundleId}/` });
  let deleted = 0;
  for (const f of files) { await f.delete({ ignoreNotFound: true }); deleted += 1; }
  const snap = await bundleRef.collection('files').get();
  for (const d of snap.docs) await d.ref.set({ status: 'purged' }, { merge: true });
  return { deleted };
}
