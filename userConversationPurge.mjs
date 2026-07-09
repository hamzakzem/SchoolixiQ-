/**
 * Superadmin-only: permanently purge all conversations/messages for a user.
 */
import crypto from 'crypto';

async function deleteInBatches(db, refs) {
  let count = 0;
  for (let i = 0; i < refs.length; i += 400) {
    const chunk = refs.slice(i, i + 400);
    const batch = db.batch();
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    count += chunk.length;
  }
  return count;
}

async function collectQueryDocs(db, collectionName, field, value) {
  const snap = await db.collection(collectionName).where(field, '==', value).get();
  return snap.docs;
}

async function collectArrayContains(db, collectionName, field, value) {
  try {
    const snap = await db.collection(collectionName).where(field, 'array-contains', value).get();
    return snap.docs;
  } catch {
    return [];
  }
}

function extractStoragePath(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const pathMatch = fileUrl.match(/\/o\/([^?]+)/);
  if (!pathMatch) return null;
  const objectPath = decodeURIComponent(pathMatch[1]);
  return objectPath.startsWith('chat_files/') ? objectPath : null;
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {string} targetUserId
 * @param {{ bucket?: import('@google-cloud/storage').Bucket | null, actorId?: string }} opts
 */
export async function purgeUserConversations(db, targetUserId, opts = {}) {
  const warnings = [];
  const deleted = {
    conversations: 0,
    system_messages: 0,
    notifications: 0,
    storageFiles: 0,
  };

  if (!targetUserId || typeof targetUserId !== 'string') {
    throw new Error('targetUserId required');
  }

  const conversationIds = new Set();
  const messageRefs = new Map();
  const storagePaths = new Set();

  const trackMessageDoc = (docSnap) => {
    messageRefs.set(docSnap.id, docSnap.ref);
    const data = docSnap.data() || {};
    if (data.conversationId) conversationIds.add(String(data.conversationId));
    const path = extractStoragePath(data.fileUrl);
    if (path) storagePaths.add(path);
  };

  try {
    const bySender = await collectQueryDocs(db, 'system_messages', 'senderId', targetUserId);
    bySender.forEach(trackMessageDoc);
  } catch (e) {
    warnings.push(`messages senderId: ${e?.message || e}`);
  }

  try {
    const byReceiver = await collectQueryDocs(db, 'system_messages', 'receiverId', targetUserId);
    byReceiver.forEach(trackMessageDoc);
  } catch (e) {
    warnings.push(`messages receiverId: ${e?.message || e}`);
  }

  const conversationRefs = new Map();

  const trackConversation = (docSnap) => {
    conversationRefs.set(docSnap.id, docSnap.ref);
    conversationIds.add(docSnap.id);
  };

  try {
    const byOwner = await collectQueryDocs(
      db,
      'conversations',
      'conversationPrivacy.ownerUserId',
      targetUserId,
    );
    byOwner.forEach(trackConversation);
  } catch (e) {
    warnings.push(`conversations ownerUserId: ${e?.message || e}`);
  }

  try {
    const byAllowed = await collectArrayContains(
      db,
      'conversations',
      'conversationPrivacy.allowedUserIds',
      targetUserId,
    );
    byAllowed.forEach(trackConversation);
  } catch (e) {
    warnings.push(`conversations allowedUserIds: ${e?.message || e}`);
  }

  try {
    const byCreated = await collectQueryDocs(db, 'conversations', 'createdBy', targetUserId);
    byCreated.forEach(trackConversation);
  } catch (e) {
    warnings.push(`conversations createdBy: ${e?.message || e}`);
  }

  try {
    const byParticipant = await collectArrayContains(db, 'conversations', 'participants', targetUserId);
    byParticipant.forEach(trackConversation);
  } catch (e) {
    warnings.push(`conversations participants: ${e?.message || e}`);
  }

  for (const convId of conversationIds) {
    try {
      const threadMsgs = await db
        .collection('system_messages')
        .where('conversationId', '==', convId)
        .get();
      threadMsgs.docs.forEach(trackMessageDoc);
    } catch (e) {
      warnings.push(`thread ${convId}: ${e?.message || e}`);
    }
  }

  try {
    deleted.system_messages = await deleteInBatches(db, [...messageRefs.values()]);
  } catch (e) {
    warnings.push(`delete messages: ${e?.message || e}`);
  }

  try {
    deleted.conversations = await deleteInBatches(db, [...conversationRefs.values()]);
  } catch (e) {
    warnings.push(`delete conversations: ${e?.message || e}`);
  }

  try {
    const notifByUser = await collectQueryDocs(db, 'notifications', 'userId', targetUserId);
    const chatNotifs = notifByUser.filter((d) => {
      const t = String(d.data()?.type ?? '');
      return ['system', 'chat', 'message'].includes(t);
    });
    deleted.notifications += await deleteInBatches(
      db,
      chatNotifs.map((d) => d.ref),
    );
  } catch (e) {
    warnings.push(`notifications userId: ${e?.message || e}`);
  }

  for (const convId of conversationIds) {
    try {
      const metaNotifs = await db
        .collection('notifications')
        .where('metadata.conversationId', '==', convId)
        .get();
      if (!metaNotifs.empty) {
        deleted.notifications += await deleteInBatches(
          db,
          metaNotifs.docs.map((d) => d.ref),
        );
      }
    } catch {
      // composite index may be missing
    }
  }

  const bucket = opts.bucket || null;
  if (bucket && storagePaths.size > 0) {
    for (const objectPath of storagePaths) {
      try {
        await bucket.file(objectPath).delete({ ignoreNotFound: true });
        deleted.storageFiles += 1;
      } catch (e) {
        warnings.push(`storage ${objectPath}: ${e?.message || e}`);
      }
    }
  }

  const auditEntry = {
    action: 'PURGE_USER_CONVERSATIONS',
    actorId: opts.actorId || null,
    targetUserId,
    deletedConversations: deleted.conversations,
    deletedMessages: deleted.system_messages,
    deletedNotifications: deleted.notifications,
    deletedStorageFiles: deleted.storageFiles,
    conversationIds: [...conversationIds],
    timestamp: new Date(),
    createdAt: new Date(),
  };

  await db.collection('audit_logs').add(auditEntry);

  return {
    ok: true,
    targetUserId,
    deleted,
    warnings,
    auditEntry,
  };
}
