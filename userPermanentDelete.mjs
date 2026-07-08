/**
 * Superadmin-only full user purge: Auth + Firestore user doc + linked notifications.
 */

const NOTIFICATION_RECIPIENT_FIELDS = ["userId", "recipientId", "receiverId"];

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {string} collectionName
 * @param {string} field
 * @param {string} value
 */
async function deleteDocsWhere(db, collectionName, field, value) {
  let deleted = 0;
  const snap = await db.collection(collectionName).where(field, "==", value).get();
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
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {string} userId
 */
async function deleteUserNotifications(db, userId) {
  let deleted = 0;
  for (const field of NOTIFICATION_RECIPIENT_FIELDS) {
    try {
      deleted += await deleteDocsWhere(db, "notifications", field, userId);
    } catch (error) {
      console.warn(`[delete-user] notifications/${field} cleanup:`, error?.message || error);
    }
  }
  return deleted;
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {string} userId
 */
async function deleteUserNotificationPreferences(db, userId) {
  let deleted = 0;
  try {
    const directRef = db.collection("notification_preferences").doc(userId);
    const directSnap = await directRef.get();
    if (directSnap.exists) {
      await directRef.delete();
      deleted += 1;
    }
  } catch (error) {
    console.warn("[delete-user] notification_preferences direct:", error?.message || error);
  }

  try {
    deleted += await deleteDocsWhere(db, "notification_preferences", "userId", userId);
  } catch (error) {
    console.warn("[delete-user] notification_preferences query:", error?.message || error);
  }

  return deleted;
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {string} userId
 */
async function unlinkParentFromStudents(db, userId, adminSdk) {
  const studentsSnap = await db
    .collection("students")
    .where("parentIds", "array-contains", userId)
    .get();

  if (studentsSnap.empty) return 0;

  const batchSize = 400;
  let updated = 0;
  const docs = studentsSnap.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const batch = db.batch();
    chunk.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        parentIds: adminSdk.firestore.FieldValue.arrayRemove(userId),
      });
    });
    await batch.commit();
    updated += chunk.length;
  }
  return updated;
}

/**
 * @param {object} params
 * @param {import('firebase-admin').firestore.Firestore} params.db
 * @param {import('firebase-admin').auth.Auth} params.authAdmin
 * @param {import('firebase-admin')} params.adminSdk
 * @param {string} params.userId
 */
export async function runUserPermanentDelete({
  db,
  authAdmin,
  adminSdk,
  userId,
}) {
  const warnings = [];
  const related = {
    notifications: 0,
    notificationPreferences: 0,
    studentsUnlinked: 0,
  };

  let firestoreExists = false;
  let authExists = false;
  let beforeData = {};

  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  firestoreExists = userSnap.exists;
  if (firestoreExists) {
    beforeData = userSnap.data() || {};
  }

  try {
    await authAdmin.getUser(userId);
    authExists = true;
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }
  }

  if (!firestoreExists && !authExists) {
    const err = new Error("User not found in Auth or Firestore");
    err.status = 404;
    throw err;
  }

  let deletedAuth = false;
  if (authExists) {
    try {
      await authAdmin.deleteUser(userId);
      deletedAuth = true;
    } catch (error) {
      if (error?.code === "auth/user-not-found") {
        warnings.push("Auth user was not found during delete");
      } else {
        throw error;
      }
    }
  } else {
    warnings.push("Auth user not found");
  }

  let deletedFirestoreUser = false;
  if (firestoreExists) {
    related.studentsUnlinked = await unlinkParentFromStudents(db, userId, adminSdk);
    related.notifications = await deleteUserNotifications(db, userId);
    related.notificationPreferences = await deleteUserNotificationPreferences(db, userId);
    await userRef.delete();
    deletedFirestoreUser = true;
  } else {
    warnings.push("Firestore user document not found");
  }

  return {
    ok: true,
    userId,
    deletedAuth,
    deletedFirestoreUser,
    warnings,
    related,
    beforeRole: beforeData.role || null,
    beforeSchoolId: beforeData.schoolId || null,
  };
}
