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

const safeDecode = (v) => { try { return decodeURIComponent(v); } catch { return null; } };

/** Object path from ONE Firebase download URL / gs:// / storage.googleapis URL / emulator URL; null if not ours. */
export function pathFromUrl(value, bucketName) {
  if (typeof value !== 'string' || value.length < 8 || value.startsWith('data:')) return null;
  let m = /^gs:\/\/([^/]+)\/(.+)$/.exec(value);
  if (m) return m[1] === bucketName ? safeDecode(m[2]) : null;
  m = /^https?:\/\/[^/]+\/v0\/b\/([^/]+)\/o\/([^?#]+)/.exec(value);
  if (m) return m[1] === bucketName ? safeDecode(m[2]) : null;
  m = /^https:\/\/storage\.googleapis\.com\/([^/]+)\/([^?#]+)/.exec(value);
  if (m) return m[1] === bucketName ? safeDecode(m[2]) : null;
  return null;
}

// URLs embedded anywhere in free text (descriptions, rich text, markdown, JSON strings)
const EMBEDDED_URL = /(?:gs:\/\/[^\s"'<>)\]]+|https?:\/\/[^\s"'<>)\]]*(?:\/v0\/b\/[^\s"'<>)\]]+|storage\.googleapis\.com\/[^\s"'<>)\]]+))/g;

/** Every Storage path referenced anywhere inside a (nested) document, including URLs embedded in text. */
export function extractStoragePaths(data, bucketName, out = new Set(), depth = 0) {
  if (data == null || depth > 6) return out;
  if (typeof data === 'string') {
    const direct = pathFromUrl(data, bucketName);
    if (direct) out.add(direct);
    else if (data.length > 20 && (data.includes('/v0/b/') || data.includes('gs://') || data.includes('storage.googleapis.com'))) {
      for (const url of data.match(EMBEDDED_URL) || []) { const p = pathFromUrl(url, bucketName); if (p) out.add(p); }
    }
    return out;
  }
  if (Array.isArray(data)) { data.forEach((v) => extractStoragePaths(v, bucketName, out, depth + 1)); return out; }
  if (typeof data === 'object') Object.values(data).forEach((v) => extractStoragePaths(v, bucketName, out, depth + 1));
  return out;
}

/** Reject anything that could escape its folder: traversal, absolute, double slash, control characters. */
export function isSafeObjectPath(path) {
  return typeof path === 'string' && path.length > 0 && path.length < 1024
    && !path.startsWith('/') && !path.includes('//') && !path.split('/').some((seg) => seg === '..' || seg === '.')
    && !/[\u0000-\u001f]/.test(path);
}

const inScope = (path, scopes) => scopes.some((s) => path.startsWith(s));

/** Collections that may hold file links, scanned GLOBALLY (all schools): a file is shared if ANY tenant still points at it. */
const REF_SCAN_COLLECTIONS = [...new Set([...Object.keys(FILE_REF_FIELDS), 'schools', 'classes', 'subjects', 'behavior', 'payroll', 'attendance_records'])];
const SCAN_PAGE = 500;
const DEFAULT_MAX_SCAN = 200_000;

/**
 * Global reference index: object path -> { schoolId, same } of a live (or trashed) record that still references it.
 * Scans every school with bounded, paginated Admin queries. Returns { complete:false } instead of guessing when the bound is hit;
 * query errors propagate (the job is retried) — callers must treat an incomplete index as "unknown = in use".
 * `excludeBundleId`: the bundle being processed (its own snapshot would otherwise count as a reference).
 */
export async function buildReferenceIndex(ctx, { excludeBundleId = null } = {}) {
  const bucketName = ctx.bucket().name;
  const max = ctx.maxRefScan ?? DEFAULT_MAX_SCAN;
  const index = new Map();
  let scanned = 0;
  const add = (data, schoolId) => { for (const p of extractStoragePaths(data, bucketName)) if (!index.has(p)) index.set(p, { schoolId: String(schoolId || '') }); };
  const ID = ctx.adminSdk.firestore.FieldPath.documentId();
  for (const col of REF_SCAN_COLLECTIONS) {
    let last = null;
    for (;;) {
      let q = ctx.db.collection(col).orderBy(ID).limit(SCAN_PAGE);
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;
      scanned += snap.size;
      if (scanned > max) return { index, complete: false, scanned, reason: 'REFERENCE_SCAN_INCOMPLETE' };
      for (const d of snap.docs) add(d.data(), d.get('schoolId'));
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < SCAN_PAGE) break;
    }
  }
  // records waiting in ANY school's recycle bin can still be restored: they keep their files in use
  let last = null;
  for (;;) {
    let q = ctx.db.collection('recycle_bin').orderBy(ID).limit(SCAN_PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    scanned += snap.size;
    if (scanned > max) return { index, complete: false, scanned, reason: 'REFERENCE_SCAN_INCOMPLETE' };
    for (const d of snap.docs) if (d.id !== excludeBundleId && ['trashing', 'trashed', 'restoring'].includes(d.get('status'))) add(d.get('record'), d.get('schoolId'));
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < SCAN_PAGE) break;
  }
  let lastItem = null;
  for (;;) {
    let q = ctx.db.collectionGroup('items').orderBy(ID).limit(SCAN_PAGE);
    if (lastItem) q = q.startAfter(lastItem);
    const snap = await q.get();
    if (snap.empty) break;
    scanned += snap.size;
    if (scanned > max) return { index, complete: false, scanned, reason: 'REFERENCE_SCAN_INCOMPLETE' };
    for (const d of snap.docs) {
      if (d.ref.parent.parent?.id === excludeBundleId) continue;
      add(d.get('data'), ''); // items of other bundles: school unknown → reported as other_tenant (conservative)
    }
    lastItem = snap.docs[snap.docs.length - 1];
    if (snap.size < SCAN_PAGE) break;
  }
  return { index, complete: true, scanned };
}

/**
 * Plan: which files belong to the records of a bundle. `records` = [{collection,id,data}] (main + dependants).
 * Returns [{path, status}] where status is 'move' | 'shared' | 'out_of_scope'.
 */
export async function planFiles(ctx, { schoolId, collection, recordId, records, excludeBundleId = null }) {
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
      if (!isSafeObjectPath(prefix.replace(/\/$/, '')) || !inScope(prefix, scopes)) continue;
      const [files] = await bucket.getFiles({ prefix });
      for (const f of files) if (!found.has(f.name)) found.set(f.name, `${r.collection}/${r.id}`);
    }
  }
  const plan = [];
  const candidates = [...found].filter(([path]) => isSafeObjectPath(path) && inScope(path, scopes));
  const refs = candidates.length ? await buildReferenceIndex(ctx, { excludeBundleId }) : { index: new Map(), complete: true };
  for (const [path, owner] of found) {
    if (!isSafeObjectPath(path) || !inScope(path, scopes)) { plan.push({ path, owner, status: 'out_of_scope' }); continue; }
    if (!refs.complete) { plan.push({ path, owner, status: 'unverified', reason: refs.reason }); continue; } // fail closed: unknown = in use
    const hit = refs.index.get(path);
    // the other tenant's identifiers are never written into data this school can reach: only "same_school" / "other_tenant"
    plan.push(hit ? { path, owner, status: 'shared', sharedWith: hit.schoolId && hit.schoolId !== String(schoolId || '') ? 'other_tenant' : 'same_school' } : { path, owner, status: 'move' });
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
    if (['restored', 'shared', 'out_of_scope', 'unverified', 'retained_unverified_inplace'].includes(f.status)) continue; // never moved: nothing to bring back
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

/**
 * Permanently remove the trashed copies (purge). Re-verifies first: a file that is referenced again (by any school, live or in a
 * bin) is rescued back to its original path; if the check cannot complete the trashed copy is KEPT (fail closed).
 */
export async function purgeTrashedFiles(ctx, bundleRef, bundleId) {
  const bucket = ctx.bucket();
  if (ctx.faults?.storage) throw new Error('injected storage fault');
  const snap = await bundleRef.collection('files').get();
  const trashed = snap.docs.filter((d) => d.get('status') === 'trashed' || d.get('status') === 'retained_unverified');
  let deleted = 0, rescued = 0, retained = 0;
  const refs = trashed.length ? await buildReferenceIndex(ctx, { excludeBundleId: bundleId }) : { index: new Map(), complete: true };
  for (const d of trashed) {
    const f = d.data();
    if (!refs.complete) { retained += 1; await d.ref.set({ status: 'retained_unverified', reason: refs.reason }, { merge: true }); continue; }
    if (refs.index.has(f.path)) {
      const [orig] = await bucket.file(f.path).exists();
      if (!orig) await bucket.file(f.trashPath).move(f.path);
      else await bucket.file(f.trashPath).delete({ ignoreNotFound: true });
      rescued += 1; await d.ref.set({ status: 'rescued' }, { merge: true }); continue;
    }
    await bucket.file(f.trashPath).delete({ ignoreNotFound: true });
    deleted += 1; await d.ref.set({ status: 'purged' }, { merge: true });
  }
  // files that were left IN PLACE because something else referenced them (or the check was incomplete): once nothing references
  // them any more, the purge of the last bundle that used them removes them (in-scope paths only; others are never planned for deletion)
  const inPlace = snap.docs.filter((d) => ['shared', 'unverified'].includes(d.get('status')) && isSafeObjectPath(d.get('path') || ''));
  if (inPlace.length) {
    const r2 = trashed.length ? refs : await buildReferenceIndex(ctx, { excludeBundleId: bundleId });
    for (const d of inPlace) {
      if (!r2.complete) { retained += 1; continue; }
      if (r2.index.has(d.get('path'))) continue; // still in use elsewhere
      await bucket.file(d.get('path')).delete({ ignoreNotFound: true });
      deleted += 1; await d.ref.set({ status: 'purged' }, { merge: true });
    }
  }
  return { deleted, rescued, retained };
}
