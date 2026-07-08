/**
 * Backend messaging cleanup — Admin SDK only.
 * Used by school permanent-delete and Super Admin hard-delete API.
 */

/**
 * Delete all school-scoped chat data: messages, conversations, related notifications,
 * and Storage attachments under chat_files/superadmin_{schoolId}/ and school-prefixed threads.
 *
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {string} schoolId
 * @param {{ bucket?: import('@google-cloud/storage').Bucket | null }} [opts]
 */
export async function deleteSchoolMessages(db, schoolId, opts = {}) {
  const warnings = [];
  const deleted = {
    system_messages: 0,
    conversations: 0,
    notifications: 0,
    storageFiles: 0,
  };

  if (!schoolId || typeof schoolId !== 'string') {
    throw new Error('schoolId required');
  }

  async function deleteBySchoolId(collectionName) {
    let count = 0;
    const snap = await db
      .collection(collectionName)
      .where('schoolId', '==', schoolId)
      .get();
    if (snap.empty) return 0;
    const docs = snap.docs;
    const batchSize = 400;
    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const batch = db.batch();
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      count += chunk.length;
    }
    return count;
  }

  try {
    deleted.system_messages = await deleteBySchoolId('system_messages');
  } catch (e) {
    warnings.push(`system_messages: ${e?.message || e}`);
  }

  try {
    deleted.conversations = await deleteBySchoolId('conversations');
  } catch (e) {
    warnings.push(`conversations: ${e?.message || e}`);
  }

  // Conversation docs keyed as superadmin_{schoolId} may lack schoolId on old data
  try {
    const legacyConvId = `superadmin_${schoolId}`;
    const legacyRef = db.collection('conversations').doc(legacyConvId);
    const legacySnap = await legacyRef.get();
    if (legacySnap.exists) {
      await legacyRef.delete();
      deleted.conversations += 1;
    }
  } catch (e) {
    warnings.push(`legacy conversation: ${e?.message || e}`);
  }

  try {
    // Chat-related notifications for this school (full school notifications also purged elsewhere)
    const notifSnap = await db
      .collection('notifications')
      .where('schoolId', '==', schoolId)
      .where('type', 'in', ['system', 'chat', 'message'])
      .get();
    if (!notifSnap.empty) {
      const docs = notifSnap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const chunk = docs.slice(i, i + 400);
        const batch = db.batch();
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        deleted.notifications += chunk.length;
      }
    }
  } catch (e) {
    // type+schoolId composite index may be missing — non-fatal
    warnings.push(`notifications chat filter: ${e?.message || e}`);
  }

  const bucket = opts.bucket || null;
  if (bucket) {
    const prefixes = [
      `chat_files/superadmin_${schoolId}/`,
      `chat_files/${schoolId}/`,
    ];
    for (const prefix of prefixes) {
      try {
        const [files] = await bucket.getFiles({ prefix });
        await Promise.all(
          files.map(async (file) => {
            try {
              await file.delete({ ignoreNotFound: true });
              deleted.storageFiles += 1;
            } catch (fileErr) {
              warnings.push(`storage ${file.name}: ${fileErr?.message || fileErr}`);
            }
          }),
        );
      } catch (e) {
        warnings.push(`storage prefix ${prefix}: ${e?.message || e}`);
      }
    }
  }

  return { schoolId, deleted, warnings };
}

/**
 * Permanently delete one system_messages doc + attachment + prune empty conversation.
 *
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {{ messageId: string, deletedBy: string, bucket?: any }} params
 */
export async function permanentlyDeleteMessage(db, params) {
  const { messageId, deletedBy, bucket = null } = params;
  if (!messageId) throw new Error('messageId required');

  const msgRef = db.collection('system_messages').doc(messageId);
  const msgSnap = await msgRef.get();
  if (!msgSnap.exists) {
    return { ok: false, error: 'NOT_FOUND' };
  }

  const data = msgSnap.data() || {};
  const conversationId = data.conversationId ? String(data.conversationId) : '';
  const fileUrl = data.fileUrl ? String(data.fileUrl) : '';

  await msgRef.delete();

  let conversationDeleted = false;
  if (conversationId) {
    const remaining = await db
      .collection('system_messages')
      .where('conversationId', '==', conversationId)
      .limit(1)
      .get();
    if (remaining.empty) {
      await db.collection('conversations').doc(conversationId).delete().catch(() => null);
      conversationDeleted = true;
    }
  }

  let storageDeleted = false;
  if (bucket && fileUrl) {
    try {
      // Prefer explicit storage path if stored; else try derive from chat_files URL path
      const pathMatch = fileUrl.match(/\/o\/([^?]+)/);
      if (pathMatch) {
        const objectPath = decodeURIComponent(pathMatch[1]);
        if (objectPath.startsWith('chat_files/')) {
          await bucket.file(objectPath).delete({ ignoreNotFound: true });
          storageDeleted = true;
        }
      }
    } catch (e) {
      // non-fatal
    }
  }

  await db.collection('audit_logs').add({
    action: 'DELETE_MESSAGE',
    deletedBy,
    targetConversation: conversationId || null,
    messageId,
    schoolId: data.schoolId || null,
    timestamp: new Date(),
    createdAt: new Date(),
  });

  return {
    ok: true,
    messageId,
    conversationId,
    conversationDeleted,
    storageDeleted,
  };
}
