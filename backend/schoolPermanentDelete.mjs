/**
 * Superadmin-only full school purge. Deletes school-scoped documents in batches,
 * removes Firebase Auth users, then deletes the school document last.
 */

export const SCHOOL_SCOPED_COLLECTIONS = [
  "students",
  "classes",
  "attendance",
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
  "system_messages",
  "conversations",
  "notification_preferences",
  "registrations",
];

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {import('firebase-admin').auth.Auth} authAdmin
 * @param {string} schoolId
 */
export async function deleteSchoolScopedCollection(db, collectionName, schoolId) {
  let deleted = 0;
  try {
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
  } catch (error) {
    console.error(`[permanent-delete] ${collectionName} cleanup failed:`, error);
    throw new Error(`Failed to cleanup ${collectionName}: ${error.message || error}`);
  }
  return deleted;
}

/**
 * @param {object} params
 * @param {import('firebase-admin').firestore.Firestore} params.db
 * @param {import('firebase-admin').auth.Auth} params.authAdmin
 * @param {string} params.schoolId
 * @param {string} [params.confirmName]
 */
export async function runSchoolPermanentDelete({
  db,
  authAdmin,
  schoolId,
  confirmName,
}) {
  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    const err = new Error("School not found");
    err.status = 404;
    throw err;
  }

  const schoolData = schoolSnap.data() || {};
  const schoolName = String(schoolData.name || "").trim();
  if (!confirmName || confirmName.trim() !== schoolName) {
    const err = new Error("School name confirmation does not match");
    err.status = 400;
    throw err;
  }

  const summary = {
    schoolId,
    schoolName,
    collections: {},
    usersDeleted: 0,
    authUsersDeleted: 0,
  };

  const usersSnap = await db
    .collection("users")
    .where("schoolId", "==", schoolId)
    .get();

  for (const uDoc of usersSnap.docs) {
    try {
      await authAdmin.deleteUser(uDoc.id);
      summary.authUsersDeleted += 1;
    } catch {
      // Auth user may not exist (e.g. student without login)
    }
    await uDoc.ref.delete();
    summary.usersDeleted += 1;
  }

  for (const colName of SCHOOL_SCOPED_COLLECTIONS) {
    summary.collections[colName] = await deleteSchoolScopedCollection(
      db,
      colName,
      schoolId,
    );
  }

  await schoolRef.delete();
  summary.collections.schools = 1;

  return summary;
}
