// School ↔ platform-admin messages live in one shared thread, `superadmin_<schoolId>`
// (the id the school side has always read and written). For a while the super admin's
// replies were written under a per-admin id, `superadmin:<uid>:school:<schoolId>`, which
// the school never reads — so schools did not see those replies. This job moves such
// messages (and their conversation summary doc) into the shared thread. It is idempotent
// and also catches replies sent later by a stale cached client.

const LEGACY = /^superadmin:([^:]+):school:(.+)$/;
const PAGE = 400;

const sharedKey = (schoolId) => `superadmin_${schoolId}`;
const millis = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : 0);

async function moveMessages(db) {
  let moved = 0;
  let cursor = null;
  for (let pass = 0; pass < 50; pass += 1) {
    let q = db.collection('system_messages')
      .where('conversationId', '>=', 'superadmin:')
      .where('conversationId', '<', 'superadmin;')
      .orderBy('conversationId')
      .limit(PAGE);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) break;
    cursor = snap.docs[snap.docs.length - 1];
    const batch = db.batch();
    let ops = 0;
    for (const docSnap of snap.docs) {
      const legacyId = String(docSnap.get('conversationId') || '');
      const m = LEGACY.exec(legacyId);
      if (!m) continue;
      const target = sharedKey(m[2]);
      batch.update(docSnap.ref, { conversationId: target, conversationKey: target, legacyConversationId: legacyId });
      ops += 1;
    }
    if (ops) {
      await batch.commit();
      moved += ops;
    }
    if (snap.size < PAGE) break;
  }
  return moved;
}

async function mergeConversations(db, FieldValue) {
  const snap = await db.collection('conversations')
    .where('conversationId', '>=', 'superadmin:')
    .where('conversationId', '<', 'superadmin;')
    .get();
  let merged = 0;
  for (const legacyDoc of snap.docs) {
    const m = LEGACY.exec(String(legacyDoc.get('conversationId') || legacyDoc.id));
    if (!m) continue;
    const schoolId = m[2];
    const key = sharedKey(schoolId);
    const targetRef = db.collection('conversations').doc(key);
    await db.runTransaction(async (tx) => {
      const target = await tx.get(targetRef);
      const legacy = legacyDoc.data() || {};
      const ids = { conversationId: key, conversationKey: key, schoolId, contactType: 'school', contactId: schoolId };
      let patch;
      if (!target.exists) {
        patch = { ...legacy, ...ids, participants: ['admin', 'super_admin'] };
      } else {
        const cur = target.data() || {};
        patch = { ...ids, participants: FieldValue.arrayUnion('admin', 'super_admin') };
        if (millis(legacy.updatedAt) > millis(cur.updatedAt)) {
          if (legacy.lastMessage !== undefined) patch.lastMessage = legacy.lastMessage;
          if (legacy.updatedAt) patch.updatedAt = legacy.updatedAt;
        }
        if (!cur.conversationAssignment && legacy.conversationAssignment) {
          patch.conversationAssignment = legacy.conversationAssignment;
        }
      }
      tx.set(targetRef, patch, { merge: true });
      tx.delete(legacyDoc.ref);
    });
    merged += 1;
  }
  return merged;
}

export async function migrateSchoolPlatformThreads(db, adminSdk) {
  const messages = await moveMessages(db);
  const conversations = await mergeConversations(db, adminSdk.firestore.FieldValue);
  if (messages || conversations) {
    console.log('[chat-thread-migration] moved into shared school threads', { messages, conversations });
  }
  return { messages, conversations };
}

/** Runs shortly after startup, then every few hours. */
export function scheduleChatThreadMigration(getDb, adminSdk, { intervalMs = 6 * 60 * 60 * 1000, delayMs = 20_000 } = {}) {
  const run = () => migrateSchoolPlatformThreads(getDb(), adminSdk).catch((e) =>
    console.error('[chat-thread-migration] run failed', e?.message || e),
  );
  setTimeout(run, delayMs);
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
}
