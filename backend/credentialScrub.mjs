// Removes passwords that older app versions stored as readable text in
// Firestore (school admin password on the school document, parent password on
// student documents, password fields on user profiles, and the requested
// password on subscription requests once they are no longer pending).
// Logins never read these fields: Firebase Auth holds the real credentials.

const BATCH_LIMIT = 400;

/** Field paths to delete per collection. A doc is touched only when one holds a non-empty string. */
const TARGETS = [
  { collection: 'schools', fields: ['adminPassword'] },
  { collection: 'students', fields: ['parentPassword'] },
  { collection: 'users', fields: ['password', 'plainPassword', 'parentPassword'] },
  {
    collection: 'registrations',
    fields: ['password', 'adminPassword', 'customerInfo.password'],
    // The super admin still needs the requested password to activate a pending request.
    keep: (data) => String(data.status || 'pending') === 'pending',
  },
];

async function scrubField(db, FieldValue, { collection, fields, keep }, field) {
  let removed = 0;
  // Bounded loop: each pass clears up to BATCH_LIMIT docs; stop when a pass changes nothing.
  for (let pass = 0; pass < 25; pass += 1) {
    // A string range query only returns docs where the field is a non-empty string.
    const snap = await db.collection(collection).where(field, '>', '').limit(BATCH_LIMIT).get();
    if (snap.empty) break;
    const batch = db.batch();
    let ops = 0;
    for (const docSnap of snap.docs) {
      if (keep && keep(docSnap.data() || {})) continue;
      const patch = {};
      for (const f of fields) patch[f] = FieldValue.delete();
      batch.update(docSnap.ref, patch);
      ops += 1;
    }
    if (!ops) break;
    await batch.commit();
    removed += ops;
    if (snap.size < BATCH_LIMIT) break;
  }
  return removed;
}

export async function scrubStoredPasswords(db, adminSdk) {
  const FieldValue = adminSdk.firestore.FieldValue;
  const summary = {};
  for (const target of TARGETS) {
    for (const field of target.fields) {
      try {
        const n = await scrubField(db, FieldValue, target, field);
        if (n) summary[`${target.collection}.${field}`] = n;
      } catch (e) {
        console.error('[credential-scrub] failed', target.collection, field, e?.message || e);
      }
    }
  }
  if (Object.keys(summary).length) console.log('[credential-scrub] removed stored passwords', summary);
  return summary;
}

/** Runs once shortly after startup, then every few hours (catches writes from stale cached clients). */
export function scheduleCredentialScrub(getDb, adminSdk, { intervalMs = 6 * 60 * 60 * 1000 } = {}) {
  const run = () => scrubStoredPasswords(getDb(), adminSdk).catch((e) =>
    console.error('[credential-scrub] run failed', e?.message || e),
  );
  setTimeout(run, 15_000);
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
}
