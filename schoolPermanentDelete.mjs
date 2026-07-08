/**
 * Superadmin-only full school purge. Deletes school-scoped documents in batches,
 * removes Firebase Auth users, then deletes the school document last.
 */

import { deleteSchoolMessages } from './schoolMessageCleanup.mjs';

export const SCHOOL_SCOPED_COLLECTIONS = [
  "students",
  "classes",
  "attendance",
  "attendance_records",
  "grades",
  "homework",
  "announcements",
  "behavior_reports",
  "teacher_reports",
  "advanced_reports",
  "installments",
  "payments",
  "payroll",
  "inventory",
  "notifications",
  "dismissal_requests",
  "dismissal_logs",
  "dismissal_snapshots",
  "id_cards",
  "student_archives",
  "staff",
  "behavior",
  "exams",
  "fees",
  "expenses",
  "logs",
  "market",
  "marketplace",
  "orders",
  "subscriptionRequests",
  "subjects",
  "print_logs",
  "audit_logs",
  "login_logs",
  // messaging cleaned via deleteSchoolMessages() before generic loop
  "notification_preferences",
  "registrations",
];

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {string} collectionName
 * @param {string} schoolId
 */
export async function deleteSchoolScopedCollection(db, collectionName, schoolId) {
  let deleted = 0;
  const snap = await db
    .collection(collectionName)
    .where("schoolId", "==", schoolId)
    .get();
  if (snap.empty) return 0;

  const docs = snap.docs;
  const batchSize = 400;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const batch = db.batch();
    chunk.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

/**
 * @param {import('firebase-admin').auth.Auth} authAdmin
 * @param {string[]} uids
 * @param {string[]} warnings
 */
async function deleteAuthUsersInBatches(authAdmin, uids, warnings) {
  let deleted = 0;
  const batchSize = 1000;
  for (let i = 0; i < uids.length; i += batchSize) {
    const chunk = uids.slice(i, i + batchSize);
    try {
      const result = await authAdmin.deleteUsers(chunk);
      const failures = result.errors?.length || 0;
      deleted += chunk.length - failures;
      for (const entry of result.errors || []) {
        const uid = chunk[entry.index];
        warnings.push(`Auth delete failed for ${uid}: ${entry.error?.message || "unknown"}`);
      }
    } catch (error) {
      warnings.push(`Auth batch delete failed: ${error?.message || error}`);
      for (const uid of chunk) {
        try {
          await authAdmin.deleteUser(uid);
          deleted += 1;
        } catch (singleError) {
          if (singleError?.code !== "auth/user-not-found") {
            warnings.push(`Auth delete failed for ${uid}: ${singleError?.message || singleError}`);
          }
        }
      }
    }
  }
  return deleted;
}

/**
 * @param {object} params
 * @param {import('firebase-admin').firestore.Firestore} params.db
 * @param {import('firebase-admin').auth.Auth} params.authAdmin
 * @param {string} params.schoolId
 * @param {boolean} [params.confirm]
 * @param {string} [params.schoolName]
 * @param {string} [params.confirmName]
 * @param {import('@google-cloud/storage').Bucket | null} [params.bucket]
 */
export async function runSchoolPermanentDelete({
  db,
  authAdmin,
  schoolId,
  confirm,
  schoolName,
  confirmName,
  bucket = null,
}) {
  if (confirm !== true) {
    const err = new Error("confirm:true is required for permanent school delete");
    err.status = 400;
    throw err;
  }

  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    const err = new Error(`School not found: ${schoolId}`);
    err.status = 404;
    throw err;
  }

  const schoolData = schoolSnap.data() || {};
  const expectedName = String(schoolData.name || "").trim();
  const providedName = String(schoolName || confirmName || "").trim();

  if (expectedName) {
    if (!providedName || providedName !== expectedName) {
      const err = new Error("School name confirmation does not match");
      err.status = 400;
      throw err;
    }
  }

  const warnings = [];
  const deletedCounts = {
    users: 0,
    authUsers: 0,
    schools: 0,
  };

  // Explicit messaging purge (messages, conversations, chat notifications, Storage)
  try {
    const msgCleanup = await deleteSchoolMessages(db, schoolId, { bucket });
    deletedCounts.system_messages = msgCleanup.deleted.system_messages;
    deletedCounts.conversations = msgCleanup.deleted.conversations;
    deletedCounts.chat_notifications = msgCleanup.deleted.notifications;
    deletedCounts.chat_storage = msgCleanup.deleted.storageFiles;
    for (const w of msgCleanup.warnings || []) warnings.push(w);
  } catch (error) {
    warnings.push(`deleteSchoolMessages failed: ${error?.message || error}`);
  }

  const usersSnap = await db
    .collection("users")
    .where("schoolId", "==", schoolId)
    .get();

  const userIds = usersSnap.docs.map((docSnap) => docSnap.id);
  deletedCounts.authUsers = await deleteAuthUsersInBatches(authAdmin, userIds, warnings);

  const userDocs = usersSnap.docs;
  const userBatchSize = 400;
  for (let i = 0; i < userDocs.length; i += userBatchSize) {
    const chunk = userDocs.slice(i, i + userBatchSize);
    const batch = db.batch();
    chunk.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    deletedCounts.users += chunk.length;
  }

  for (const colName of SCHOOL_SCOPED_COLLECTIONS) {
    try {
      deletedCounts[colName] = await deleteSchoolScopedCollection(db, colName, schoolId);
    } catch (error) {
      warnings.push(`Failed to cleanup ${colName}: ${error?.message || error}`);
      deletedCounts[colName] = 0;
    }
  }

  await schoolRef.delete();
  deletedCounts.schools = 1;

  return {
    ok: true,
    schoolId,
    schoolName: expectedName,
    deletedCounts,
    warnings,
  };
}
