// server.ts
import express from "express";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import dotEnv from "dotenv";
import fs from "fs";
import crypto3 from "crypto";

// schoolMessageCleanup.mjs
async function deleteSchoolMessages(db, schoolId, opts = {}) {
  const warnings = [];
  const deleted = {
    system_messages: 0,
    conversations: 0,
    notifications: 0,
    storageFiles: 0
  };
  if (!schoolId || typeof schoolId !== "string") {
    throw new Error("schoolId required");
  }
  async function deleteBySchoolId(collectionName) {
    let count = 0;
    const snap = await db.collection(collectionName).where("schoolId", "==", schoolId).get();
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
    deleted.system_messages = await deleteBySchoolId("system_messages");
  } catch (e) {
    warnings.push(`system_messages: ${e?.message || e}`);
  }
  try {
    deleted.conversations = await deleteBySchoolId("conversations");
  } catch (e) {
    warnings.push(`conversations: ${e?.message || e}`);
  }
  try {
    const legacyConvId = `superadmin_${schoolId}`;
    const legacyRef = db.collection("conversations").doc(legacyConvId);
    const legacySnap = await legacyRef.get();
    if (legacySnap.exists) {
      await legacyRef.delete();
      deleted.conversations += 1;
    }
  } catch (e) {
    warnings.push(`legacy conversation: ${e?.message || e}`);
  }
  try {
    const notifSnap = await db.collection("notifications").where("schoolId", "==", schoolId).where("type", "in", ["system", "chat", "message"]).get();
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
    warnings.push(`notifications chat filter: ${e?.message || e}`);
  }
  const bucket = opts.bucket || null;
  if (bucket) {
    const prefixes = [
      `chat_files/superadmin_${schoolId}/`,
      `chat_files/${schoolId}/`
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
          })
        );
      } catch (e) {
        warnings.push(`storage prefix ${prefix}: ${e?.message || e}`);
      }
    }
  }
  return { schoolId, deleted, warnings };
}
async function permanentlyDeleteMessage(db, params) {
  const { messageId, deletedBy, bucket = null } = params;
  if (!messageId) throw new Error("messageId required");
  const msgRef = db.collection("system_messages").doc(messageId);
  const msgSnap = await msgRef.get();
  if (!msgSnap.exists) {
    return { ok: false, error: "NOT_FOUND" };
  }
  const data = msgSnap.data() || {};
  const conversationId = data.conversationId ? String(data.conversationId) : "";
  const fileUrl = data.fileUrl ? String(data.fileUrl) : "";
  await msgRef.delete();
  let conversationDeleted = false;
  if (conversationId) {
    const remaining = await db.collection("system_messages").where("conversationId", "==", conversationId).limit(1).get();
    if (remaining.empty) {
      await db.collection("conversations").doc(conversationId).delete().catch(() => null);
      conversationDeleted = true;
    }
  }
  let storageDeleted = false;
  if (bucket && fileUrl) {
    try {
      const pathMatch = fileUrl.match(/\/o\/([^?]+)/);
      if (pathMatch) {
        const objectPath = decodeURIComponent(pathMatch[1]);
        if (objectPath.startsWith("chat_files/")) {
          await bucket.file(objectPath).delete({ ignoreNotFound: true });
          storageDeleted = true;
        }
      }
    } catch (e) {
    }
  }
  await db.collection("audit_logs").add({
    action: "DELETE_MESSAGE",
    deletedBy,
    targetConversation: conversationId || null,
    messageId,
    schoolId: data.schoolId || null,
    timestamp: /* @__PURE__ */ new Date(),
    createdAt: /* @__PURE__ */ new Date()
  });
  return {
    ok: true,
    messageId,
    conversationId,
    conversationDeleted,
    storageDeleted
  };
}

// schoolPermanentDelete.mjs
var SCHOOL_SCOPED_COLLECTIONS = [
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
  "registrations"
];
async function deleteSchoolScopedCollection(db, collectionName, schoolId) {
  let deleted = 0;
  const snap = await db.collection(collectionName).where("schoolId", "==", schoolId).get();
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
async function deleteAuthUsersInBatches(authAdmin, uids, warnings) {
  let deleted = 0;
  const batchSize = 1e3;
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
async function runSchoolPermanentDelete({
  db,
  authAdmin,
  schoolId,
  confirm,
  schoolName,
  confirmName,
  bucket = null
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
    schools: 0
  };
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
  const usersSnap = await db.collection("users").where("schoolId", "==", schoolId).get();
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
    warnings
  };
}

// userConversationPurge.mjs
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
  const snap = await db.collection(collectionName).where(field, "==", value).get();
  return snap.docs;
}
async function collectArrayContains(db, collectionName, field, value) {
  try {
    const snap = await db.collection(collectionName).where(field, "array-contains", value).get();
    return snap.docs;
  } catch {
    return [];
  }
}
function extractStoragePath(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return null;
  const pathMatch = fileUrl.match(/\/o\/([^?]+)/);
  if (!pathMatch) return null;
  const objectPath = decodeURIComponent(pathMatch[1]);
  return objectPath.startsWith("chat_files/") ? objectPath : null;
}
async function purgeUserConversations(db, targetUserId, opts = {}) {
  const warnings = [];
  const deleted = {
    conversations: 0,
    system_messages: 0,
    notifications: 0,
    storageFiles: 0
  };
  if (!targetUserId || typeof targetUserId !== "string") {
    throw new Error("targetUserId required");
  }
  const conversationIds = /* @__PURE__ */ new Set();
  const messageRefs = /* @__PURE__ */ new Map();
  const storagePaths = /* @__PURE__ */ new Set();
  const trackMessageDoc = (docSnap) => {
    messageRefs.set(docSnap.id, docSnap.ref);
    const data = docSnap.data() || {};
    if (data.conversationId) conversationIds.add(String(data.conversationId));
    const path2 = extractStoragePath(data.fileUrl);
    if (path2) storagePaths.add(path2);
  };
  try {
    const bySender = await collectQueryDocs(db, "system_messages", "senderId", targetUserId);
    bySender.forEach(trackMessageDoc);
  } catch (e) {
    warnings.push(`messages senderId: ${e?.message || e}`);
  }
  try {
    const byReceiver = await collectQueryDocs(db, "system_messages", "receiverId", targetUserId);
    byReceiver.forEach(trackMessageDoc);
  } catch (e) {
    warnings.push(`messages receiverId: ${e?.message || e}`);
  }
  const conversationRefs = /* @__PURE__ */ new Map();
  const trackConversation = (docSnap) => {
    conversationRefs.set(docSnap.id, docSnap.ref);
    conversationIds.add(docSnap.id);
  };
  try {
    const byOwner = await collectQueryDocs(
      db,
      "conversations",
      "conversationPrivacy.ownerUserId",
      targetUserId
    );
    byOwner.forEach(trackConversation);
  } catch (e) {
    warnings.push(`conversations ownerUserId: ${e?.message || e}`);
  }
  try {
    const byAllowed = await collectArrayContains(
      db,
      "conversations",
      "conversationPrivacy.allowedUserIds",
      targetUserId
    );
    byAllowed.forEach(trackConversation);
  } catch (e) {
    warnings.push(`conversations allowedUserIds: ${e?.message || e}`);
  }
  try {
    const byCreated = await collectQueryDocs(db, "conversations", "createdBy", targetUserId);
    byCreated.forEach(trackConversation);
  } catch (e) {
    warnings.push(`conversations createdBy: ${e?.message || e}`);
  }
  try {
    const byParticipant = await collectArrayContains(db, "conversations", "participants", targetUserId);
    byParticipant.forEach(trackConversation);
  } catch (e) {
    warnings.push(`conversations participants: ${e?.message || e}`);
  }
  for (const convId of conversationIds) {
    try {
      const threadMsgs = await db.collection("system_messages").where("conversationId", "==", convId).get();
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
    const notifByUser = await collectQueryDocs(db, "notifications", "userId", targetUserId);
    const chatNotifs = notifByUser.filter((d) => {
      const t = String(d.data()?.type ?? "");
      return ["system", "chat", "message"].includes(t);
    });
    deleted.notifications += await deleteInBatches(
      db,
      chatNotifs.map((d) => d.ref)
    );
  } catch (e) {
    warnings.push(`notifications userId: ${e?.message || e}`);
  }
  for (const convId of conversationIds) {
    try {
      const metaNotifs = await db.collection("notifications").where("metadata.conversationId", "==", convId).get();
      if (!metaNotifs.empty) {
        deleted.notifications += await deleteInBatches(
          db,
          metaNotifs.docs.map((d) => d.ref)
        );
      }
    } catch {
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
    action: "PURGE_USER_CONVERSATIONS",
    actorId: opts.actorId || null,
    targetUserId,
    deletedConversations: deleted.conversations,
    deletedMessages: deleted.system_messages,
    deletedNotifications: deleted.notifications,
    deletedStorageFiles: deleted.storageFiles,
    conversationIds: [...conversationIds],
    timestamp: /* @__PURE__ */ new Date(),
    createdAt: /* @__PURE__ */ new Date()
  };
  await db.collection("audit_logs").add(auditEntry);
  return {
    ok: true,
    targetUserId,
    deleted,
    warnings,
    auditEntry
  };
}

// messagingAccess.mjs
import crypto from "crypto";
var PLATFORM_OPS_PERMISSIONS = /* @__PURE__ */ new Set([
  "manage_schools",
  "manage_subscriptions",
  "view_requests",
  "manage_users",
  "manage_packages",
  "manage_system",
  "system_settings"
]);
function asPermissionList(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (raw && typeof raw === "object") {
    return Object.entries(raw).filter(([, v]) => v === true).map(([k]) => k);
  }
  return [];
}
function extractConversationPrivacy(data) {
  if (!data) return null;
  const raw = data.conversationPrivacy;
  if (!raw || typeof raw !== "object") return null;
  const visibility = String(raw.visibility ?? "").toLowerCase().trim();
  if (![
    "superadmin_private",
    "platform_assistant_private",
    "platform_operations",
    "school_private"
  ].includes(visibility)) {
    return null;
  }
  const ownerUserId = String(raw.ownerUserId ?? "").trim();
  if (!ownerUserId) return null;
  return {
    ownerUserId,
    ownerRole: String(raw.ownerRole ?? "").toLowerCase().trim(),
    visibility,
    allowedUserIds: Array.isArray(raw.allowedUserIds) ? raw.allowedUserIds.map(String) : [],
    allowedRoles: Array.isArray(raw.allowedRoles) ? raw.allowedRoles.map(String) : []
  };
}
function computePrivacyHash(privacy) {
  const ids = [...privacy.allowedUserIds || []].map(String).sort().join(",");
  const payload = `${privacy.ownerUserId}|${privacy.visibility}|${ids}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}
function verifyPrivacyHash(doc) {
  const privacy = extractConversationPrivacy(doc);
  if (!privacy) return false;
  const stored = String(doc.privacyHash ?? "").trim();
  if (!stored) return false;
  return computePrivacyHash(privacy) === stored;
}
function authorizeConversationAccess(user, conversation) {
  if (!user || !conversation) return false;
  const role = String(user.role || "").toLowerCase();
  const permissions = asPermissionList(user.permissions);
  const uid = String(user.uid || "");
  if (role === "superadmin" || role === "super_admin") return true;
  const privacy = extractConversationPrivacy(conversation);
  if (role === "platform_assistant") {
    const hasOps = permissions.some((p) => PLATFORM_OPS_PERMISSIONS.has(p));
    if (!hasOps) return false;
    if (!privacy) return false;
    if (!verifyPrivacyHash(conversation)) return false;
    if (privacy.visibility === "superadmin_private") return false;
    if (privacy.visibility === "platform_assistant_private") {
      return privacy.ownerUserId === uid;
    }
    if (privacy.visibility === "platform_operations") return true;
    return false;
  }
  if (["admin", "school_admin", "staff", "school_assistant", "assistant"].includes(role)) {
    const userSchool = String(user.schoolId || "").trim();
    const convSchool = String(conversation.schoolId || "").trim();
    if (!userSchool || !convSchool || userSchool !== convSchool) return false;
    if (privacy && !verifyPrivacyHash(conversation)) return role === "superadmin";
    return true;
  }
  return false;
}

// userPermanentDelete.mjs
var NOTIFICATION_RECIPIENT_FIELDS = ["userId", "recipientId", "receiverId"];
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
async function unlinkParentFromStudents(db, userId, adminSdk) {
  const studentsSnap = await db.collection("students").where("parentIds", "array-contains", userId).get();
  if (studentsSnap.empty) return 0;
  const batchSize = 400;
  let updated = 0;
  const docs = studentsSnap.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const batch = db.batch();
    chunk.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        parentIds: adminSdk.firestore.FieldValue.arrayRemove(userId)
      });
    });
    await batch.commit();
    updated += chunk.length;
  }
  return updated;
}
async function runUserPermanentDelete({
  db,
  authAdmin,
  adminSdk,
  userId
}) {
  const warnings = [];
  const related = {
    notifications: 0,
    notificationPreferences: 0,
    studentsUnlinked: 0
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
    beforeSchoolId: beforeData.schoolId || null
  };
}

// distributorCommissions.mjs
var COMMISSION_COLLECTION = "distributorMonthlyCommissions";
var COUPONS_COLLECTION = "distributorCoupons";
var DISTRIBUTORS_COLLECTION = "distributors";
function normalizeCouponCode(code) {
  return String(code || "").trim().toUpperCase();
}
function normalizeMonthKey(monthKey) {
  const m = String(monthKey || "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) {
    const err = new Error("INVALID_MONTH_KEY");
    err.code = "INVALID_MONTH_KEY";
    throw err;
  }
  return m;
}
function assertDistributorApprovedForCoupons(distributor) {
  const status = String(distributor.status || "").toLowerCase();
  if (status === "pending") {
    const err = new Error("DISTRIBUTOR_PENDING");
    err.code = "DISTRIBUTOR_PENDING";
    throw err;
  }
  if (status === "rejected" || distributor.canLogin === false) {
    const err = new Error("DISTRIBUTOR_INACTIVE");
    err.code = "DISTRIBUTOR_INACTIVE";
    throw err;
  }
  if (distributor.active === false) {
    const err = new Error("DISTRIBUTOR_INACTIVE");
    err.code = "DISTRIBUTOR_INACTIVE";
    throw err;
  }
}
function buildCommissionDocId(distributorId, schoolId, monthKey) {
  return `${distributorId}_${schoolId}_${monthKey}`;
}
function calculateCommissionAmount(netAmount, commissionPercent) {
  const net = Number(netAmount) || 0;
  const pct = Number(commissionPercent) || 0;
  return Math.round(net * pct / 100);
}
function resolveSchoolPaymentStatus(school) {
  const pay = String(school.paymentStatus || "").toLowerCase();
  if (pay) return pay;
  if (String(school.status || "").toLowerCase() === "active") return "paid";
  return "";
}
function validateCouponForRedemption(coupon, normalizedCode) {
  if (!coupon) {
    const err = new Error("\u0643\u0648\u0628\u0648\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
    err.code = "COUPON_NOT_FOUND";
    throw err;
  }
  if (coupon.active === false) {
    const err = new Error("\u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u063A\u064A\u0631 \u0646\u0634\u0637");
    err.code = "COUPON_INACTIVE";
    throw err;
  }
  const maxUses = coupon.maxUses ?? coupon.maxRedemptions;
  if (maxUses != null && Number(coupon.redemptionCount || 0) >= Number(maxUses)) {
    const err = new Error("\u062A\u0645 \u0627\u0633\u062A\u0646\u0641\u0627\u062F \u0639\u062F\u062F \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0627\u062A \u0627\u0644\u0643\u0648\u0628\u0648\u0646");
    err.code = "COUPON_EXHAUSTED";
    throw err;
  }
  if (coupon.expiresAt) {
    let expiry = coupon.expiresAt;
    if (typeof expiry?.toDate === "function") expiry = expiry.toDate();
    else expiry = new Date(expiry);
    if (expiry instanceof Date && !Number.isNaN(expiry.getTime()) && expiry < /* @__PURE__ */ new Date()) {
      const err = new Error("\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0643\u0648\u0628\u0648\u0646");
      err.code = "COUPON_EXPIRED";
      throw err;
    }
  }
  if (!coupon.distributorId) {
    const err = new Error("\u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u063A\u064A\u0631 \u0645\u0631\u0628\u0648\u0637 \u0628\u0645\u0648\u0632\u0639");
    err.code = "COUPON_NO_DISTRIBUTOR";
    throw err;
  }
  if (normalizedCode && coupon.code && normalizeCouponCode(coupon.code) !== normalizedCode) {
    const err = new Error("\u0643\u0648\u0628\u0648\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
    err.code = "COUPON_NOT_FOUND";
    throw err;
  }
  return true;
}
function isDistributorTrackedSchool(school) {
  if (!school) return false;
  if (school.trackingSource === "direct") return false;
  if (school.trackingSource === "distributor") return Boolean(school.distributorId);
  return Boolean(school.distributorId);
}
function buildDistributorTrackingFields(coupon, distributor, couponCode) {
  const commissionPercent = Number(
    coupon.commissionPercent ?? distributor.commissionPercent ?? 0
  );
  const discountPercent = Number(coupon.discountPercent ?? 0);
  const fixedDiscountAmount = Number(coupon.discountAmount ?? 0);
  const normalizedCode = normalizeCouponCode(coupon.code || couponCode);
  return {
    distributorId: String(coupon.distributorId),
    distributorName: String(distributor.name || coupon.distributorName || ""),
    couponCode: normalizedCode,
    distributorCouponCode: normalizedCode,
    discountPercent,
    discountAmount: fixedDiscountAmount,
    commissionPercent,
    trackingSource: "distributor",
    distributorCommissionPercent: commissionPercent,
    distributorCommissionType: "recurring_monthly",
    distributorCommissionPaused: false,
    ...discountPercent > 0 ? { distributorDiscountPercent: discountPercent } : {},
    ...fixedDiscountAmount > 0 ? { distributorDiscountAmount: fixedDiscountAmount } : {}
  };
}
function isSchoolCommissionEligible(school) {
  if (!isDistributorTrackedSchool(school)) {
    return {
      eligible: false,
      reason: school?.trackingSource === "direct" ? "direct_tracking" : "no_distributor"
    };
  }
  if (!school?.distributorId) {
    return { eligible: false, reason: "no_distributor" };
  }
  if (school.distributorCommissionPaused === true) {
    return { eligible: false, reason: "paused" };
  }
  const status = String(school.status || "").toLowerCase();
  if (["suspended", "inactive", "archived", "rejected"].includes(status)) {
    return { eligible: false, reason: "inactive" };
  }
  const subStatus = String(school.subscriptionStatus || "active").toLowerCase();
  if (subStatus !== "active") {
    return { eligible: false, reason: "subscription_inactive" };
  }
  const payStatus = resolveSchoolPaymentStatus(school);
  if (!["paid", "approved"].includes(payStatus)) {
    return { eligible: false, reason: "unpaid" };
  }
  return { eligible: true, reason: null };
}
function resolveSubscriptionAmount(school, packageData) {
  const pkg = packageData || {};
  const monthly = Number(pkg.priceMonthly);
  if (monthly > 0) return monthly;
  const yearly = Number(pkg.price);
  if (yearly > 0) return Math.round(yearly / 12);
  const fromSchool = Number(school.subscriptionAmount || school.lastPaymentAmount);
  return fromSchool > 0 ? fromSchool : 0;
}
function resolveDiscountAmount(school, subscriptionAmount) {
  const pct = Number(school.discountPercent ?? school.distributorDiscountPercent);
  if (pct > 0) return Math.round(subscriptionAmount * pct / 100);
  const fixed = Number(school.distributorDiscountAmount);
  if (fixed > 0) return Math.min(fixed, subscriptionAmount);
  return Number(school.discountAmount) || 0;
}
async function findCouponByCode(db, code) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const snap = await db.collection(COUPONS_COLLECTION).where("code", "==", normalized).limit(1).get();
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}
async function applyDistributorCoupon({
  db,
  adminSdk,
  schoolId,
  couponCode,
  actorUid
}) {
  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    const err = new Error("SCHOOL_NOT_FOUND");
    err.code = "SCHOOL_NOT_FOUND";
    throw err;
  }
  const school = schoolSnap.data() || {};
  if (school.distributorId) {
    return {
      linked: false,
      alreadyLinked: true,
      distributorId: school.distributorId
    };
  }
  const coupon = await findCouponByCode(db, couponCode);
  validateCouponForRedemption(coupon, normalizeCouponCode(couponCode));
  const distributorSnap = await db.collection(DISTRIBUTORS_COLLECTION).doc(String(coupon.distributorId)).get();
  if (!distributorSnap.exists) {
    const err = new Error("DISTRIBUTOR_NOT_FOUND");
    err.code = "DISTRIBUTOR_NOT_FOUND";
    throw err;
  }
  const distributor = distributorSnap.data() || {};
  assertDistributorApprovedForCoupons(distributor);
  const trackingFields = buildDistributorTrackingFields(
    coupon,
    distributor,
    couponCode
  );
  const commissionPercent = trackingFields.commissionPercent;
  const planId = String(school.planId || "basic");
  const pkgSnap = await db.collection("packages").doc(planId).get();
  const packageData = pkgSnap.exists ? pkgSnap.data() : {};
  const subscriptionAmount = resolveSubscriptionAmount(school, packageData);
  const computedDiscountAmount = resolveDiscountAmount(
    { ...school, ...trackingFields },
    subscriptionAmount
  );
  if (computedDiscountAmount > 0) {
    trackingFields.discountAmount = computedDiscountAmount;
  }
  const FieldValue = adminSdk.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();
  await schoolRef.update({
    ...trackingFields,
    distributorLinkedAt: now,
    updatedAt: now,
    ...actorUid ? { distributorLinkedBy: actorUid } : {}
  });
  await db.collection(COUPONS_COLLECTION).doc(coupon.id).set(
    {
      redemptionCount: FieldValue.increment(1),
      lastRedeemedAt: now,
      lastRedeemedSchoolId: schoolId
    },
    { merge: true }
  );
  return {
    linked: true,
    alreadyLinked: false,
    trackingSource: "distributor",
    distributorId: String(coupon.distributorId),
    commissionPercent,
    discountPercent: trackingFields.discountPercent,
    discountAmount: trackingFields.discountAmount || 0,
    commissionAccrued: false
  };
}
async function generateMonthlyCommissions({ db, adminSdk, monthKey }) {
  const normalizedMonth = normalizeMonthKey(monthKey);
  const FieldValue = adminSdk.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();
  const [legacySnap, trackedSnap] = await Promise.all([
    db.collection("schools").where("distributorCommissionType", "==", "recurring_monthly").get(),
    db.collection("schools").where("trackingSource", "==", "distributor").get()
  ]);
  const schoolDocMap = /* @__PURE__ */ new Map();
  for (const schoolDoc of [...legacySnap.docs, ...trackedSnap.docs]) {
    schoolDocMap.set(schoolDoc.id, schoolDoc);
  }
  const counts = {
    generated: 0,
    skippedInactive: 0,
    skippedUnpaid: 0,
    alreadyExists: 0,
    monthKey: normalizedMonth
  };
  const packageCache = /* @__PURE__ */ new Map();
  for (const schoolDoc of schoolDocMap.values()) {
    const school = schoolDoc.data() || {};
    const schoolId = schoolDoc.id;
    const distributorId = String(school.distributorId || "");
    if (!distributorId) continue;
    const eligibility = isSchoolCommissionEligible(school);
    if (!eligibility.eligible) {
      if (eligibility.reason === "unpaid" || eligibility.reason === "subscription_inactive") {
        counts.skippedUnpaid += 1;
      } else {
        counts.skippedInactive += 1;
      }
      continue;
    }
    const docId = buildCommissionDocId(distributorId, schoolId, normalizedMonth);
    const commissionRef = db.collection(COMMISSION_COLLECTION).doc(docId);
    const existing = await commissionRef.get();
    if (existing.exists) {
      counts.alreadyExists += 1;
      continue;
    }
    const planId = String(school.planId || "basic");
    let packageData = packageCache.get(planId);
    if (packageData === void 0) {
      const pkgSnap = await db.collection("packages").doc(planId).get();
      packageData = pkgSnap.exists ? pkgSnap.data() : {};
      packageCache.set(planId, packageData);
    }
    const subscriptionAmount = resolveSubscriptionAmount(school, packageData);
    const discountAmount = resolveDiscountAmount(school, subscriptionAmount);
    const netAmount = Math.max(0, subscriptionAmount - discountAmount);
    const commissionPercent = Number(
      school.commissionPercent ?? school.distributorCommissionPercent ?? 0
    );
    const commissionAmount = calculateCommissionAmount(netAmount, commissionPercent);
    await commissionRef.set({
      id: docId,
      distributorId,
      distributorName: String(school.distributorName || ""),
      schoolId,
      schoolName: String(school.name || ""),
      monthKey: normalizedMonth,
      planId,
      planName: String(packageData?.name || planId),
      subscriptionAmount,
      discountAmount,
      netAmount,
      commissionPercent,
      commissionAmount,
      status: "earned",
      generatedAt: now,
      earnedAt: now,
      paidAt: null,
      paidBy: null,
      canceledAt: null,
      notes: ""
    });
    counts.generated += 1;
  }
  return counts;
}
async function markCommissionPaid({
  db,
  adminSdk,
  commissionId,
  paidBy,
  notes
}) {
  const ref = db.collection(COMMISSION_COLLECTION).doc(commissionId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error("COMMISSION_NOT_FOUND");
    err.code = "COMMISSION_NOT_FOUND";
    throw err;
  }
  const data = snap.data() || {};
  if (data.status === "paid") {
    return { updated: false, alreadyPaid: true, id: commissionId };
  }
  if (data.status === "canceled") {
    const err = new Error("COMMISSION_CANCELED");
    err.code = "COMMISSION_CANCELED";
    throw err;
  }
  const FieldValue = adminSdk.firestore.FieldValue;
  await ref.update({
    status: "paid",
    paidAt: FieldValue.serverTimestamp(),
    paidBy,
    ...notes ? { notes: String(notes) } : {}
  });
  return { updated: true, alreadyPaid: false, id: commissionId };
}
async function markDistributorMonthCommissionsPaid({
  db,
  adminSdk,
  distributorId,
  monthKey,
  paidBy,
  notes
}) {
  const normalizedMonth = normalizeMonthKey(monthKey);
  const snap = await db.collection(COMMISSION_COLLECTION).where("distributorId", "==", distributorId).where("monthKey", "==", normalizedMonth).get();
  let updated = 0;
  let skipped = 0;
  for (const docSnap of snap.docs) {
    const status = docSnap.data()?.status;
    if (status === "paid" || status === "canceled") {
      skipped += 1;
      continue;
    }
    await markCommissionPaid({
      db,
      adminSdk,
      commissionId: docSnap.id,
      paidBy,
      notes
    });
    updated += 1;
  }
  return { updated, skipped, distributorId, monthKey: normalizedMonth };
}
async function setSchoolDistributorCommissionPaused({
  db,
  adminSdk,
  schoolId,
  paused,
  pausedBy
}) {
  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    const err = new Error("SCHOOL_NOT_FOUND");
    err.code = "SCHOOL_NOT_FOUND";
    throw err;
  }
  const school = schoolSnap.data() || {};
  if (!school.distributorId) {
    const err = new Error("SCHOOL_NOT_LINKED");
    err.code = "SCHOOL_NOT_LINKED";
    throw err;
  }
  const FieldValue = adminSdk.firestore.FieldValue;
  const update = {
    distributorCommissionPaused: paused === true,
    updatedAt: FieldValue.serverTimestamp()
  };
  if (paused) {
    update.distributorCommissionPausedAt = FieldValue.serverTimestamp();
    update.distributorCommissionPausedBy = pausedBy;
  } else {
    update.distributorCommissionPausedAt = null;
    update.distributorCommissionPausedBy = null;
  }
  await schoolRef.update(update);
  return { schoolId, paused: paused === true };
}

// distributorApproval.mjs
import crypto2 from "crypto";
var DISTRIBUTORS_COL = "distributors";
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}
function normalizePhone(phone) {
  return String(phone || "").trim();
}
async function registerDistributorApplication(db, adminSdk, input) {
  const name = String(input.name || "").trim();
  const phone = normalizePhone(input.phone);
  const address = String(input.address || "").trim();
  const governorate = String(input.governorate || "").trim();
  const email = normalizeEmail(input.email);
  if (!name || !phone || !address || !governorate) {
    const err = new Error("\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u064A\u062C\u0628 \u062A\u0639\u0628\u0626\u062A\u0647\u0627");
    err.code = "INVALID_BODY";
    throw err;
  }
  const existingByPhone = await db.collection(DISTRIBUTORS_COL).where("phone", "==", phone).where("status", "in", ["pending", "active"]).limit(1).get();
  if (!existingByPhone.empty) {
    const err = new Error("\u064A\u0648\u062C\u062F \u0637\u0644\u0628 \u0623\u0648 \u062D\u0633\u0627\u0628 \u0645\u0648\u0632\u0639 \u0645\u0633\u062C\u0644 \u0628\u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645 \u0645\u0633\u0628\u0642\u0627\u064B");
    err.code = "PHONE_ALREADY_REGISTERED";
    throw err;
  }
  if (email) {
    const existingByEmail = await db.collection(DISTRIBUTORS_COL).where("email", "==", email).where("status", "in", ["pending", "active"]).limit(1).get();
    if (!existingByEmail.empty) {
      const err = new Error("\u064A\u0648\u062C\u062F \u0637\u0644\u0628 \u0623\u0648 \u062D\u0633\u0627\u0628 \u0645\u0648\u0632\u0639 \u0645\u0633\u062C\u0644 \u0628\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u0645\u0633\u0628\u0642\u0627\u064B");
      err.code = "EMAIL_ALREADY_REGISTERED";
      throw err;
    }
  }
  const FieldValue = adminSdk.firestore.FieldValue;
  const ref = db.collection(DISTRIBUTORS_COL).doc();
  await ref.set({
    name,
    phone,
    address,
    governorate,
    email: email || "",
    status: "pending",
    canLogin: false,
    active: false,
    commissionPercent: 10,
    source: "self_registration",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  return { id: ref.id, status: "pending" };
}
async function listPendingDistributors(db) {
  const snap = await db.collection(DISTRIBUTORS_COL).where("status", "==", "pending").get();
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })).sort((a, b) => {
    const aSec = a.createdAt?.seconds || 0;
    const bSec = b.createdAt?.seconds || 0;
    return bSec - aSec;
  });
}
async function approveDistributor({
  db,
  authAdmin,
  adminSdk,
  distributorId,
  actorUid,
  password,
  syncClaims
}) {
  const ref = db.collection(DISTRIBUTORS_COL).doc(distributorId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error("DISTRIBUTOR_NOT_FOUND");
    err.code = "DISTRIBUTOR_NOT_FOUND";
    throw err;
  }
  const data = snap.data() || {};
  if (data.status === "active" && data.canLogin === true) {
    return { alreadyActive: true, distributorId, userId: data.userId || null };
  }
  if (data.status === "rejected") {
    const err = new Error("DISTRIBUTOR_REJECTED");
    err.code = "DISTRIBUTOR_REJECTED";
    throw err;
  }
  const FieldValue = adminSdk.firestore.FieldValue;
  let userId = String(data.userId || "").trim();
  const email = normalizeEmail(data.email);
  const displayName = String(data.name || "\u0645\u0648\u0632\u0639");
  if (!userId && email) {
    let uid = "";
    const securePass = String(password || "").trim() || `${crypto2.randomBytes(16).toString("hex")}SecureP1!`;
    try {
      const existing = await authAdmin.getUserByEmail(email);
      uid = existing.uid;
      const updateParams = { emailVerified: true, displayName };
      if (password) {
        updateParams.password = password;
      } else {
        const hasPassword = existing.providerData.some((p) => p.providerId === "password");
        if (!hasPassword) updateParams.password = securePass;
      }
      await authAdmin.updateUser(uid, updateParams);
    } catch (authError) {
      if (authError.code === "auth/user-not-found") {
        const created = await authAdmin.createUser({
          email,
          password: securePass,
          displayName,
          emailVerified: true
        });
        uid = created.uid;
      } else {
        throw authError;
      }
    }
    await db.collection("users").doc(uid).set(
      {
        uid,
        email,
        name: displayName,
        role: "distributor",
        distributorId,
        phone: data.phone || "",
        status: "active",
        schoolId: "",
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    await syncClaims(uid, "distributor", "");
    userId = uid;
  }
  await ref.update({
    status: "active",
    canLogin: true,
    active: true,
    ...userId ? { userId } : {},
    approvedAt: FieldValue.serverTimestamp(),
    approvedBy: actorUid,
    updatedAt: FieldValue.serverTimestamp()
  });
  return {
    alreadyActive: false,
    distributorId,
    userId: userId || null,
    userCreated: Boolean(userId),
    needsEmailForLogin: !userId
  };
}
async function rejectDistributor({ db, adminSdk, distributorId, actorUid, reason }) {
  const ref = db.collection(DISTRIBUTORS_COL).doc(distributorId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error("DISTRIBUTOR_NOT_FOUND");
    err.code = "DISTRIBUTOR_NOT_FOUND";
    throw err;
  }
  const FieldValue = adminSdk.firestore.FieldValue;
  await ref.update({
    status: "rejected",
    canLogin: false,
    active: false,
    rejectedAt: FieldValue.serverTimestamp(),
    rejectedBy: actorUid,
    rejectionReason: String(reason || "").trim(),
    updatedAt: FieldValue.serverTimestamp()
  });
  return { distributorId, status: "rejected" };
}

// roleHierarchy.ts
var ROLE_RANK = {
  superadmin: 100,
  super_admin: 100,
  platform_assistant: 90,
  admin: 80,
  school_admin: 80,
  staff: 60,
  school_assistant: 55,
  /** @deprecated legacy — maps via normalizeEffectiveRole */
  assistant: 55,
  teacher: 50,
  parent: 40,
  guard: 30,
  distributor: 25,
  student: 20
};
var PLATFORM_ASSISTANT_PERMISSION_HINTS = /* @__PURE__ */ new Set([
  "manage_packages",
  "manage_schools",
  "view_requests",
  "manage_distributors",
  "manage_users",
  "system_settings",
  "view_backups",
  "manage_subscriptions",
  "manage_system"
]);
function normalizeRole(role) {
  if (!role) return "";
  if (role === "super_admin") return "superadmin";
  return role;
}
function normalizeEffectiveRole(role, schoolId, userData) {
  const r = normalizeRole(role);
  if (!r) return "";
  if (r === "platform_assistant" || r === "school_assistant") return r;
  if (r === "assistant") {
    const type = String(userData?.assistantType ?? userData?.assistantScope ?? "").toLowerCase().trim();
    if (type === "platform") return "platform_assistant";
    if (type === "school") return "school_assistant";
    const sid = schoolId ? String(schoolId).trim() : "";
    if (sid) return "school_assistant";
    const perms = userData?.permissions;
    if (Array.isArray(perms) && perms.some((p) => PLATFORM_ASSISTANT_PERMISSION_HINTS.has(String(p)))) {
      return "platform_assistant";
    }
    return sid ? "school_assistant" : "platform_assistant";
  }
  return r;
}
function roleRank(role) {
  return ROLE_RANK[normalizeEffectiveRole(role) || normalizeRole(role)] ?? 0;
}
function isSuperAdminRole(role) {
  return normalizeRole(role) === "superadmin";
}
function isSchoolAdminRole(role) {
  const r = normalizeRole(role);
  return r === "admin" || r === "school_admin";
}
function canActorUseAdminApi(role, schoolId, userData) {
  const r = normalizeEffectiveRole(role, schoolId, userData);
  if (isSuperAdminRole(r)) return true;
  if (isSchoolAdminRole(r)) return true;
  if (r === "platform_assistant") return true;
  if (r === "staff" || r === "school_assistant" || r === "assistant") {
    return Boolean(schoolId && String(schoolId).trim());
  }
  return false;
}
function canActorCreateRole(actorRole, targetRole, actorSchoolId) {
  const actor = normalizeEffectiveRole(actorRole, actorSchoolId);
  const target = normalizeRole(targetRole);
  if (!target) return false;
  if (target === "superadmin") return actor === "superadmin";
  if (target === "distributor") return actor === "superadmin";
  if (actor === "platform_assistant") return false;
  if (["admin", "school_admin"].includes(target)) {
    return actor === "superadmin";
  }
  if (target === "platform_assistant") {
    return actor === "superadmin";
  }
  if (target === "assistant") {
    return false;
  }
  if (isSuperAdminRole(actor)) return true;
  if (isSchoolAdminRole(actor)) {
    return [
      "teacher",
      "parent",
      "guard",
      "staff",
      "school_assistant",
      "student"
    ].includes(target);
  }
  if (actor === "staff" || actor === "school_assistant") {
    return target === "parent";
  }
  return false;
}
function canActorSyncClaims(actorRole, targetRole, actorSchoolId) {
  const actor = normalizeEffectiveRole(actorRole, actorSchoolId);
  const target = normalizeRole(targetRole);
  if (!target) return false;
  if (isSuperAdminRole(actor)) return true;
  if (actor === "platform_assistant") return false;
  if (isSchoolAdminRole(actor)) {
    return roleRank(target) < roleRank("admin");
  }
  return false;
}
function canActorDeleteStudent(actorRole, actorSchoolId) {
  const actor = normalizeEffectiveRole(actorRole, actorSchoolId);
  if (isSuperAdminRole(actor)) return true;
  if (actor === "platform_assistant") return false;
  return isSchoolAdminRole(actor);
}

// notificationPushDispatch.ts
var PUSH_MAX_AGE_MS = 10 * 60 * 1e3;
var TERMINAL_STATUSES = /* @__PURE__ */ new Set(["sent", "partial", "skipped", "no_tokens", "failed", "error"]);
function logPush(event, meta) {
  console.info(`[Notifications] ${event}`, meta);
}
function getCreatedAtMs(notif) {
  const ca = notif.createdAt;
  if (!ca) return null;
  if (typeof ca.toMillis === "function") {
    return ca.toMillis();
  }
  if (typeof ca.seconds === "number") {
    return ca.seconds * 1e3;
  }
  if (ca instanceof Date) return ca.getTime();
  return null;
}
function isPushTerminal(notif) {
  if (notif.pushDispatched === true) return true;
  const status = notif.pushDelivery?.status;
  return Boolean(status && TERMINAL_STATUSES.has(status));
}
function isWithinPushAgeWindow(notif, maxAgeMs = PUSH_MAX_AGE_MS) {
  const ms = getCreatedAtMs(notif);
  if (ms === null) return true;
  return Date.now() - ms <= maxAgeMs;
}
async function writePushDelivery(docRef, adminSdk, payload) {
  await docRef.set(
    {
      pushDispatched: payload.status === "sent" || payload.status === "partial",
      pushDispatchedAt: adminSdk.firestore.FieldValue.serverTimestamp(),
      pushDelivery: {
        ...payload,
        at: adminSdk.firestore.FieldValue.serverTimestamp()
      }
    },
    { merge: true }
  );
}
async function claimNotificationForPush(docRef, adminSdk) {
  return docRef.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) return { claimed: false, notif: null, skipReason: "missing" };
    const notif = snap.data();
    if (isPushTerminal(notif)) {
      return { claimed: false, notif, skipReason: "already_handled" };
    }
    if (!isWithinPushAgeWindow(notif)) {
      tx.set(
        docRef,
        {
          pushDelivery: {
            status: "skipped",
            reason: "too_old",
            at: adminSdk.firestore.FieldValue.serverTimestamp()
          }
        },
        { merge: true }
      );
      return { claimed: false, notif, skipReason: "too_old" };
    }
    const delivery = notif.pushDelivery;
    if (delivery?.status === "pending" && delivery.lockedAt?.toMillis) {
      const lockedMs = delivery.lockedAt.toMillis();
      if (Date.now() - lockedMs < 6e4) {
        return { claimed: false, notif, skipReason: "locked" };
      }
    }
    tx.set(
      docRef,
      {
        pushDelivery: {
          status: "pending",
          lockedAt: adminSdk.firestore.FieldValue.serverTimestamp()
        }
      },
      { merge: true }
    );
    return { claimed: true, notif };
  });
}
async function resolveUserTokens(db, userId, notifSchoolId) {
  let userTokens = [];
  if (userId === "super_admin") {
    const superAdminsSnap = await db.collection("users").where("role", "==", "superadmin").get();
    superAdminsSnap.docs.forEach((docSnap) => {
      const tokens = docSnap.data().fcmTokens;
      if (Array.isArray(tokens)) userTokens.push(...tokens);
    });
  } else {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return [];
    const userData = userDoc.data() || {};
    if (notifSchoolId && notifSchoolId !== "system" && userData.schoolId && userData.schoolId !== notifSchoolId) {
      logPush("PUSH_SEND_SKIPPED", { userId, reason: "school_mismatch", schoolId: notifSchoolId });
      return [];
    }
    const tokens = userData.fcmTokens;
    if (Array.isArray(tokens)) userTokens.push(...tokens);
  }
  return Array.from(new Set(userTokens.filter((t) => typeof t === "string" && t.trim().length > 0)));
}
async function dispatchPushForNotificationDoc(db, adminSdk, notifId, notif) {
  const docRef = db.collection("notifications").doc(notifId);
  const userId = String(notif.userId || "");
  const notifSchoolId = String(notif.schoolId || "");
  const title = String(notif.title || "\u0625\u0634\u0639\u0627\u0631 \u062C\u062F\u064A\u062F");
  const message = String(notif.message || notif.content || "");
  const type = String(notif.type || "system");
  const routeTarget = String(
    notif.routeTarget || notif.metadata?.routeTarget || notif.metadata?.route || type
  );
  if (!userId) {
    await writePushDelivery(docRef, adminSdk, { status: "skipped", reason: "no_userId" });
    logPush("PUSH_SEND_SKIPPED", { notifId, reason: "no_userId" });
    return { notifId, status: "skipped", reason: "no_userId" };
  }
  logPush("PUSH_SEND_START", { notifId, userId, type, schoolId: notifSchoolId });
  try {
    const userTokens = await resolveUserTokens(db, userId, notifSchoolId);
    if (userTokens.length === 0) {
      await writePushDelivery(docRef, adminSdk, {
        status: "no_tokens",
        successCount: 0,
        failureCount: 0
      });
      logPush("PUSH_SEND_SKIPPED", { notifId, userId, reason: "no_tokens" });
      return { notifId, status: "no_tokens", reason: "no_tokens" };
    }
    const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
    const clickUrl = appUrl ? `${appUrl}/?tab=${encodeURIComponent(routeTarget)}` : `/?tab=${encodeURIComponent(routeTarget)}`;
    const metadata = notif.metadata || {};
    const dedupKey = typeof metadata.dedupKey === "string" ? metadata.dedupKey : "";
    const messages = userTokens.map((token) => ({
      token,
      notification: { title, body: message },
      data: {
        type,
        schoolId: notifSchoolId,
        userId,
        notificationId: notifId,
        routeTarget,
        route: routeTarget,
        url: clickUrl,
        ...dedupKey ? { dedupKey } : {}
      },
      webpush: appUrl ? { fcmOptions: { link: clickUrl } } : void 0,
      android: {
        priority: "high",
        notification: { sound: "default" }
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } }
      }
    }));
    const response = await adminSdk.messaging().sendEach(messages);
    const invalidTokens = [];
    response.responses.forEach((res, idx) => {
      if (res.success) return;
      const code = res.error?.code || "";
      if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
        invalidTokens.push(userTokens[idx]);
      }
    });
    if (invalidTokens.length > 0 && userId !== "super_admin") {
      await db.collection("users").doc(userId).update({
        fcmTokens: adminSdk.firestore.FieldValue.arrayRemove(...invalidTokens)
      }).catch(() => {
      });
      logPush("PUSH_SEND_SUCCESS", {
        notifId,
        prunedTokens: invalidTokens.length
      });
    }
    const status = response.failureCount === 0 ? "sent" : "partial";
    await writePushDelivery(docRef, adminSdk, {
      status,
      successCount: response.successCount,
      failureCount: response.failureCount
    });
    logPush("PUSH_SEND_SUCCESS", {
      notifId,
      successCount: response.successCount,
      failureCount: response.failureCount
    });
    return {
      notifId,
      status,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (err) {
    const message2 = err instanceof Error ? err.message : String(err);
    await writePushDelivery(docRef, adminSdk, { status: "error", error: message2 }).catch(() => {
    });
    logPush("PUSH_SEND_ERROR", { notifId, error: message2 });
    return { notifId, status: "error", reason: message2 };
  }
}
async function processNotificationPush(db, adminSdk, notifId, notif) {
  const docRef = db.collection("notifications").doc(notifId);
  if (isPushTerminal(notif)) {
    logPush("PUSH_SEND_SKIPPED", { notifId, reason: "terminal_status" });
    return null;
  }
  if (!isWithinPushAgeWindow(notif)) {
    await writePushDelivery(docRef, adminSdk, { status: "skipped", reason: "too_old" });
    logPush("PUSH_SEND_SKIPPED", { notifId, reason: "too_old" });
    return { notifId, status: "skipped", reason: "too_old" };
  }
  const claim = await claimNotificationForPush(docRef, adminSdk);
  if (!claim.claimed) {
    if (claim.skipReason && claim.skipReason !== "locked") {
      logPush("PUSH_SEND_SKIPPED", { notifId, reason: claim.skipReason });
    }
    return claim.skipReason ? { notifId, status: "skipped", reason: claim.skipReason } : null;
  }
  return dispatchPushForNotificationDoc(db, adminSdk, notifId, claim.notif || notif);
}
function setupNotificationPushListener(db, adminSdk) {
  let isInitialSnapshot = true;
  db.collection("notifications").onSnapshot(
    (snapshot) => {
      if (!snapshot) return;
      if (isInitialSnapshot) {
        isInitialSnapshot = false;
        logPush("PUSH_SEND_START", { event: "listener_ready", skippedInitial: snapshot.size });
        return;
      }
      for (const change of snapshot.docChanges()) {
        if (change.type !== "added") continue;
        const notifId = change.doc.id;
        const notif = change.doc.data();
        void processNotificationPush(db, adminSdk, notifId, notif);
      }
    },
    (err) => {
      logPush("PUSH_SEND_ERROR", { event: "listener", error: err.message });
    }
  );
  logPush("PUSH_SEND_START", { event: "fcm_gateway_initialized" });
}
async function pollRecentNotificationsForPush(db, adminSdk, limit = 50) {
  const cutoff = adminSdk.firestore.Timestamp.fromMillis(Date.now() - PUSH_MAX_AGE_MS);
  const snap = await db.collection("notifications").where("createdAt", ">=", cutoff).orderBy("createdAt", "desc").limit(limit).get();
  const results = [];
  for (const docSnap of snap.docs) {
    const notif = docSnap.data();
    if (isPushTerminal(notif)) continue;
    const result = await processNotificationPush(db, adminSdk, docSnap.id, notif);
    if (result) results.push(result);
  }
  return results;
}

// server.ts
dotEnv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var firebaseConfigPath = path.join(__dirname, "firebase-applet-config.json");
var firebaseConfig = { projectId: "" };
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
}
var sanitizeEnv = (val) => {
  if (!val) return val;
  let sanitized = val.trim();
  sanitized = sanitized.replace(/^["']+|["']+$/g, "").trim();
  if (sanitized.includes("\\n")) {
    sanitized = sanitized.replace(/\\n/g, "\n");
  }
  if (sanitized.startsWith("-----BEGIN") && !sanitized.includes("\n")) {
  }
  return sanitized;
};
var serviceAccount = {
  projectId: sanitizeEnv(process.env.FIREBASE_PROJECT_ID) || firebaseConfig.projectId,
  clientEmail: sanitizeEnv(process.env.FIREBASE_CLIENT_EMAIL),
  privateKey: sanitizeEnv(process.env.FIREBASE_PRIVATE_KEY)
};
if (serviceAccount.clientEmail && serviceAccount.privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: firebaseConfig.storageBucket
      // Added
    });
    console.log("Firebase Admin initialized with service account.");
  } catch (e) {
    console.error("Firebase Admin Initialization Error");
  }
} else {
  try {
    admin.initializeApp({
      storageBucket: firebaseConfig.storageBucket
      // Added
    });
    console.log("Firebase Admin initialized with defaults.");
  } catch (e) {
    console.warn("Firebase Admin failed to initialize.");
  }
}
var getDb = () => {
  const dbId = firebaseConfig.firestoreDatabaseId;
  if (admin.apps.length === 0) {
    return getFirestore();
  }
  return getFirestore(admin.app(), dbId || "(default)");
};
var MIN_CRON_SECRET_LEN = 32;
function isProductionEnv() {
  return process.env.NODE_ENV === "production";
}
function redactEmail(email) {
  if (!email) return "[no-email]";
  if (!isProductionEnv()) return email;
  const at = email.indexOf("@");
  if (at <= 0) return "[redacted]";
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
}
function redactUid(uid) {
  if (!uid) return "[no-uid]";
  if (!isProductionEnv()) return uid;
  if (uid.length <= 10) return "[redacted-uid]";
  return `${uid.slice(0, 6)}\u2026${uid.slice(-4)}`;
}
function resolveCronSecret(...candidates) {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;
    if (isProductionEnv() && trimmed.length < MIN_CRON_SECRET_LEN) continue;
    return trimmed;
  }
  return null;
}
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3e3;
  if (isProductionEnv()) {
    if (!resolveCronSecret(process.env.TUITION_CRON_SECRET, process.env.CRON_SECRET)) {
      console.error(
        `[SECURITY] Production requires TUITION_CRON_SECRET or CRON_SECRET (min ${MIN_CRON_SECRET_LEN} chars). Tuition cron endpoint will reject all requests.`
      );
    }
    if (!resolveCronSecret(process.env.NOTIFICATION_CRON_SECRET, process.env.CRON_SECRET)) {
      console.error(
        `[SECURITY] Production requires NOTIFICATION_CRON_SECRET or CRON_SECRET (min ${MIN_CRON_SECRET_LEN} chars). Push dispatch cron will reject all requests.`
      );
    }
  }
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      "https://schoolixiq.com",
      "https://www.schoolixiq.com",
      "https://app.schoolixiq.com",
      "https://schoolixiq.iq",
      "https://www.schoolixiq.iq",
      "https://app.schoolixiq.iq"
    ];
    if (process.env.APP_URL) {
      allowedOrigins.push(process.env.APP_URL.replace(/\/$/, "").toLowerCase());
    }
    const allowedPatterns = [
      /\.run\.app$/,
      // Matches Cloud Run dev / preview URLs
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^capacitor:\/\/localhost$/,
      /^https?:\/\/.*-99877674137\.europe-west2\.run\.app$/
      // Matches current / future previews environment
    ];
    let isAllowed = false;
    if (!origin) {
      isAllowed = true;
    } else {
      const lowerOrigin = origin.toLowerCase().trim();
      if (allowedOrigins.map((o) => o.toLowerCase().trim()).includes(lowerOrigin)) {
        isAllowed = true;
      } else {
        isAllowed = allowedPatterns.some((pattern) => pattern.test(lowerOrigin));
      }
    }
    if (origin && isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else if (origin) {
      console.warn(`Blocked CORS request from origin: ${origin}`);
      return res.status(403).json({ error: "CORS_BLOCKED", message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0645\u0635\u062F\u0631 \u0644\u0644\u0648\u0627\u062C\u0647\u0629 \u0627\u0644\u0628\u0631\u0645\u062C\u064A\u0629" });
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Authorization, x-requested-with, accept, origin");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  const sanitizeForFirestore = (val) => {
    if (val === void 0) return null;
    if (val === null) return null;
    if (typeof val === "object") {
      if (val instanceof Date) {
        return val;
      }
      if (val instanceof admin.firestore.FieldValue || val instanceof admin.firestore.Timestamp || val instanceof admin.firestore.GeoPoint || val instanceof admin.firestore.DocumentReference) {
        return val;
      }
      if (val.constructor && [
        "FieldValue",
        "Timestamp",
        "GeoPoint",
        "DocumentReference",
        "FieldValueInside",
        "TimestampInside",
        "Date"
      ].includes(val.constructor.name)) {
        return val;
      }
      if (typeof val.toDate === "function") {
        return val;
      }
    }
    if (Array.isArray(val)) return val.map(sanitizeForFirestore);
    if (typeof val === "object") {
      const cleaned = {};
      for (const key of Object.keys(val)) {
        const value = val[key];
        if (value !== void 0) {
          cleaned[key] = sanitizeForFirestore(value);
        }
      }
      return cleaned;
    }
    return val;
  };
  const logAudit = async (req, action, details) => {
    try {
      const db = getDb();
      const user = req.user || {};
      const sanitizedDetails = details ? sanitizeForFirestore(details) : {};
      const expiresAt = admin.firestore.Timestamp.fromMillis(
        Date.now() + 90 * 24 * 60 * 60 * 1e3
      );
      await db.collection("audit_logs").add({
        action,
        performedBy: user.email || "system",
        uid: user.uid || "system",
        schoolId: user.schoolId || "system",
        ip: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
        details: sanitizedDetails,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt
      });
    } catch (error) {
      console.error("Audit Log Error:", error);
    }
  };
  const getBootstrapAdmins = () => {
    const raw = process.env.BOOTSTRAP_ADMIN_EMAILS?.trim();
    if (!raw) {
      if (isProductionEnv()) {
        console.warn("[SECURITY] BOOTSTRAP_ADMIN_EMAILS unset in production \u2014 bootstrap super-admin disabled.");
      }
      return [];
    }
    return raw.toLowerCase().split(",").map((e) => e.trim()).filter(Boolean);
  };
  const syncUserClaims = async (uid, role, schoolId, permissions) => {
    try {
      const securityVersion = 4;
      const claims = {
        role,
        schoolId: schoolId || "",
        sv: securityVersion,
        p: permissions || null
        // Optional permissions snapshot
      };
      const claimsStr = JSON.stringify(claims);
      if (Buffer.byteLength(claimsStr, "utf8") > 900) {
        console.warn(`[SECURITY] Custom claims size (${Buffer.byteLength(claimsStr, "utf8")} bytes) exceeds limit for UID: ${redactUid(uid)}. Stripping nested permissions 'p' to avoid claims exception.`);
        claims.p = null;
      }
      await admin.auth().setCustomUserClaims(uid, claims);
      console.log(`Claims synced for user ${redactUid(uid)}: role=${role}, sv=${securityVersion}`);
    } catch (error) {
      console.error(`Error setting claims for user ${redactUid(uid)}:`, error);
    }
  };
  const verifyAdmin = async (req, res, next) => {
    let authHeader = req.headers.authorization;
    if (!authHeader && req.headers["x-authorization"]) {
      authHeader = req.headers["x-authorization"];
    }
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const email = decodedToken.email?.toLowerCase();
      let isBootstrapAdmin = false;
      if (getBootstrapAdmins().includes(email) && decodedToken.email_verified === true) {
        const db = getDb();
        const userDoc = await db.collection("users").doc(decodedToken.uid).get();
        const usersCount = (await db.collection("users").limit(1).get()).size;
        if (usersCount === 0 || userDoc.exists && userDoc.data()?.role === "superadmin") {
          isBootstrapAdmin = true;
          if (decodedToken.role !== "superadmin") {
            await syncUserClaims(decodedToken.uid, "superadmin");
          }
        }
      }
      let role = decodedToken.role;
      let schoolId = decodedToken.schoolId;
      if (!role || decodedToken.p === void 0) {
        const db = getDb();
        const userDoc = await db.collection("users").doc(decodedToken.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          role = userData?.role || "staff";
          schoolId = userData?.schoolId || "";
          let permissions = userData?.permissions || null;
          if (schoolId && (!permissions || typeof permissions !== "object")) {
            const schoolDoc = await db.collection("schools").doc(schoolId).get();
            if (schoolDoc.exists) {
              const planId = schoolDoc.data()?.planId || "basic";
              const packageDoc = await db.collection("packages").doc(planId).get();
              if (packageDoc.exists) {
                permissions = packageDoc.data()?.permissions || null;
              }
            }
          }
          await syncUserClaims(decodedToken.uid, role, schoolId, permissions);
        } else if (!isBootstrapAdmin) {
          return res.status(403).json({ error: "Forbidden: User profile not found" });
        }
      }
      if (!canActorUseAdminApi(role, schoolId)) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }
      if (role !== "superadmin" && schoolId) {
        const db = getDb();
        const schoolDoc = await db.collection("schools").doc(schoolId).get();
        if (schoolDoc.exists) {
          const expirationData = schoolDoc.data()?.subscriptionExpiresAt;
          if (expirationData) {
            let expiryDate;
            if (typeof expirationData.toDate === "function") {
              expiryDate = expirationData.toDate();
            } else {
              expiryDate = new Date(expirationData);
            }
            if (expiryDate < /* @__PURE__ */ new Date()) {
              return res.status(402).json({ error: "SUBSCRIPTION_EXPIRED", message: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0634\u062A\u0631\u0627\u0643 \u0627\u0644\u0645\u062F\u0631\u0633\u0629" });
            }
          }
        }
      }
      req.user = { ...decodedToken, role, schoolId };
      next();
    } catch (error) {
      console.error("VerifyAdmin Error:", error.message);
      res.status(401).json({ error: `Authentication failed: ${error.message}` });
    }
  };
  const verifyToken = async (req, res, next) => {
    let authHeader = req.headers.authorization;
    if (!authHeader && req.headers["x-authorization"]) {
      authHeader = req.headers["x-authorization"];
    }
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized", message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B \u0644\u0644\u0642\u064A\u0627\u0645 \u0628\u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064A\u0629" });
    }
    const token = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (e) {
      return res.status(401).json({ error: "AuthenticationFailed", message: `\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0647\u0648\u064A\u0629: ${e.message}` });
    }
  };
  const SCHOOL_IMAGE_UPLOAD_ROLES = [
    "superadmin",
    "super_admin",
    "admin",
    "school_admin",
    "assistant",
    "school_assistant",
    "staff"
  ];
  const STUDENT_PHOTO_UPLOAD_ROLES = [
    "superadmin",
    "super_admin",
    "admin",
    "school_admin",
    "assistant",
    "school_assistant",
    "staff"
  ];
  const isSuperAdminRole3 = (role) => role === "superadmin" || role === "super_admin";
  function assertSafeStoragePath(storagePath) {
    if (!storagePath || typeof storagePath !== "string" || storagePath.includes("..") || storagePath.startsWith("/") || storagePath.includes("\\")) {
      throw Object.assign(new Error("INVALID_UPLOAD_PATH"), { status: 400 });
    }
  }
  function assertSchoolScope(role, userSchoolId, pathSchoolId) {
    if (!isSuperAdminRole3(role) && userSchoolId !== pathSchoolId) {
      throw Object.assign(new Error("FORBIDDEN_SCHOOL"), { status: 403 });
    }
  }
  function assertImageExtension(fileName) {
    if (!/\.(jpe?g|png|webp|gif)$/i.test(fileName)) {
      throw Object.assign(new Error("INVALID_FILE_TYPE"), { status: 400 });
    }
  }
  async function assertUploadPathAllowed(uid, storagePath, tokenUser) {
    assertSafeStoragePath(storagePath);
    const db = getDb();
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
    }
    const userData = userDoc.data() || {};
    const tokenRole = String(tokenUser?.role || "");
    const tokenSchoolId = String(tokenUser?.schoolId || "");
    const role = String(userData.role || tokenRole || "");
    const schoolId = String(userData.schoolId || tokenSchoolId || "");
    const logoMatch = storagePath.match(/^schools\/([^/]+)\/logo\/([^/]+)$/);
    if (logoMatch) {
      const pathSchoolId = logoMatch[1];
      const fileName = logoMatch[2];
      if (!SCHOOL_IMAGE_UPLOAD_ROLES.includes(role)) {
        throw Object.assign(new Error("FORBIDDEN_ROLE"), { status: 403 });
      }
      assertSchoolScope(role, schoolId, pathSchoolId);
      if (!/^logo_\d+\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
        throw Object.assign(new Error("INVALID_LOGO_PATH"), { status: 400 });
      }
      assertImageExtension(fileName);
      return { role, schoolId };
    }
    const storeMatch = storagePath.match(/^schools\/([^/]+)\/store\/products\/([^/]+)$/);
    if (storeMatch) {
      const pathSchoolId = storeMatch[1];
      const fileName = storeMatch[2];
      if (!SCHOOL_IMAGE_UPLOAD_ROLES.includes(role)) {
        throw Object.assign(new Error("FORBIDDEN_ROLE"), { status: 403 });
      }
      assertSchoolScope(role, schoolId, pathSchoolId);
      if (!/^\d+-[^/]+\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)) {
        throw Object.assign(new Error("INVALID_STORE_IMAGE_PATH"), { status: 400 });
      }
      assertImageExtension(fileName);
      return { role, schoolId };
    }
    const studentMatch = storagePath.match(/^students\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (studentMatch) {
      const pathSchoolId = studentMatch[1];
      const fileName = studentMatch[3];
      if (!STUDENT_PHOTO_UPLOAD_ROLES.includes(role)) {
        throw Object.assign(new Error("FORBIDDEN_ROLE"), { status: 403 });
      }
      assertSchoolScope(role, schoolId, pathSchoolId);
      if (!/^photo_\d+\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
        throw Object.assign(new Error("INVALID_STUDENT_PHOTO_PATH"), { status: 400 });
      }
      assertImageExtension(fileName);
      return { role, schoolId };
    }
    throw Object.assign(new Error("INVALID_UPLOAD_PATH"), { status: 400 });
  }
  app.post("/api/upload", verifyToken, express.json({ limit: "20mb" }), async (req, res) => {
    try {
      const { path: storagePath, base64 } = req.body;
      if (!storagePath || !base64) return res.status(400).json({ error: "Missing path or base64" });
      try {
        await assertUploadPathAllowed(req.user.uid, storagePath, req.user);
      } catch (authzError) {
        const status = authzError.status || 403;
        const code = authzError.message || "FORBIDDEN";
        const message = code === "FORBIDDEN_SCHOOL" ? "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0631\u0641\u0639 \u0635\u0648\u0631 \u0644\u0645\u062F\u0631\u0633\u0629 \u0623\u062E\u0631\u0649" : code === "FORBIDDEN_ROLE" ? "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0631\u0641\u0639 \u0647\u0630\u0647 \u0627\u0644\u0635\u0648\u0631\u0629" : code === "INVALID_UPLOAD_PATH" || code === "INVALID_STORE_IMAGE_PATH" || code === "INVALID_LOGO_PATH" ? "\u0645\u0633\u0627\u0631 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" : code === "INVALID_FILE_TYPE" ? "\u0646\u0648\u0639 \u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645" : "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629";
        return res.status(status).json({ error: code, message });
      }
      const base64Data = base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const maxSizeBytes = 10 * 1024 * 1024;
      if (buffer.length > maxSizeBytes) {
        return res.status(400).json({
          error: "FILE_TOO_LARGE",
          message: "\u062D\u062C\u0645 \u0627\u0644\u0645\u0644\u0641 \u0643\u0628\u064A\u0631 \u062C\u062F\u0627\u064B. \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647 \u0647\u0648 10 \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A."
        });
      }
      const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
      const ext = path.extname(storagePath).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        return res.status(400).json({
          error: "INVALID_FILE_TYPE",
          message: "\u0646\u0648\u0639 \u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645. \u064A\u064F\u0633\u0645\u062D \u0628\u0631\u0641\u0639 \u0635\u0648\u0631 \u0641\u0642\u0637."
        });
      }
      let contentType = "application/octet-stream";
      if (base64.startsWith("data:")) {
        const mimeMatch = base64.match(/^data:([^;]+);base64,/);
        if (mimeMatch) {
          contentType = mimeMatch[1];
        }
      } else {
        const mimeTypes = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".webp": "image/webp",
          ".pdf": "application/pdf",
          ".doc": "application/msword",
          ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ".xls": "application/vnd.ms-excel",
          ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ".txt": "text/plain",
          ".mp3": "audio/mpeg",
          ".m4a": "audio/mp4",
          ".wav": "audio/wav",
          ".json": "application/json"
        };
        contentType = mimeTypes[ext] || "application/octet-stream";
      }
      const disallowedMimeTypes = ["text/html", "text/javascript", "application/javascript", "application/x-msdownload", "application/x-sh", "application/bat"];
      if (disallowedMimeTypes.includes(contentType.toLowerCase())) {
        return res.status(400).json({
          error: "FORBIDDEN_FILE_TYPE",
          message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0631\u0641\u0639 \u0645\u0644\u0641\u0627\u062A \u0628\u0631\u0645\u062C\u064A\u0629 \u0623\u0648 \u0635\u0641\u062D\u0627\u062A \u0648\u064A\u0628 \u0646\u0647\u0627\u0626\u064A\u0627\u064B."
        });
      }
      try {
        const bucket = getStorage().bucket();
        const file = bucket.file(storagePath);
        const token = crypto3.randomUUID();
        await file.save(buffer, {
          metadata: {
            contentType,
            metadata: {
              firebaseStorageDownloadTokens: token
            }
          }
        });
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`;
        return res.json({ url });
      } catch (uploadError) {
        if (uploadError.message?.includes("bucket does not exist") || uploadError.message?.toLowerCase().includes("not found") || uploadError.code === 404) {
          console.warn("Storage bucket not found, falling back to base64 Data URL...");
          return res.json({ url: base64 });
        }
        throw uploadError;
      }
    } catch (error) {
      console.error("Upload API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/api/public/verify-student/:studentId", async (req, res) => {
    try {
      const studentId = String(req.params.studentId || "").trim();
      if (!studentId || studentId.length > 128) {
        return res.status(400).json({ error: "INVALID_ID", message: "Invalid student id" });
      }
      const db = getDb();
      const snap = await db.collection("students").doc(studentId).get();
      if (!snap.exists) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Student not found" });
      }
      const data = snap.data() || {};
      if (data.deleted === true || data.status === "archived") {
        return res.status(404).json({ error: "NOT_FOUND", message: "Student not found" });
      }
      let className = typeof data.className === "string" ? data.className : "";
      if (!className && data.classId) {
        const classSnap = await db.collection("classes").doc(String(data.classId)).get();
        if (classSnap.exists) {
          className = String(classSnap.data()?.name || "");
        }
      }
      let schoolName = "";
      if (data.schoolId) {
        const schoolSnap = await db.collection("schools").doc(String(data.schoolId)).get();
        if (schoolSnap.exists) {
          schoolName = String(schoolSnap.data()?.name || "");
        }
      }
      res.setHeader("Cache-Control", "public, max-age=60");
      return res.json({
        id: snap.id,
        name: String(data.name || ""),
        className,
        dob: String(data.dob || data.dateOfBirth || ""),
        registrationNumber: String(data.registrationNumber || ""),
        schoolName,
        verified: true
      });
    } catch (error) {
      console.error("Public verify student error:", error);
      return res.status(500).json({ error: "SERVER_ERROR", message: "Unable to verify student" });
    }
  });
  app.get("/api/download/schoolixiq.mobileconfig", (req, res) => {
    const host = req.get("host") || "schoolixiq.com";
    const protocol = req.headers["x-forwarded-proto"] === "https" || req.secure ? "https" : "http";
    const currentUrl = `${protocol}://${host}`;
    const profileXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key>
      <true/>
      <key>Icon</key>
      <data>
        iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAABXklEQVR4nO2WsU4CMRRFb8EILg6OJsYBB3+Co4Oji/8g
        /of7MjoZsDo6EAcX6XW6pVAeF7pG03uS9gXb0pS778vLqyAiIiIiIiIiIiIiIiIiIiIiIiIiIiIievX09DzMv063BvABrIEtQAfoA8cAtG2fM9K1XpE+sKst
        q2Fq+77nZf66bY7AIn9dFfV6O1/Zz6B0U+6y5W0H2AKX6iX6p9rZ9oT153uI5yv6U8gYI5+v9KdyqZ5yZ+Q3mOepbE7kK9YpZ0be6m9b6BGrv23r78/S9Zlz
        9S7lXN9D4Gv+2m/Tfshb6Anb0FfM0f6v+Xv0XbO8beXFfA9GvsIcsU5nzDbyjP31U3O8Tfvk7DlyzH6asV72/99039/Zf39Xvv5PcsR+GvscEWevWe6/XofY
        DWe6mUfsp/Fj9G+YyZfR/SMyrYn92N8RERERERERERERERERERERERERERERkR79AdA9W8G957+9AAAAAElFTkSuQmCC
      </data>
      <key>IsRemovable</key>
      <true/>
      <key>Label</key>
      <string>SchoolixiQ</string>
      <key>PayloadDescription</key>
      <string>\u0645\u0646\u0635\u0629 SchoolixiQ \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629</string>
      <key>PayloadDisplayName</key>
      <string>SchoolixiQ</string>
      <key>PayloadIdentifier</key>
      <string>com.schoolixiq.app</string>
      <key>PayloadType</key>
      <string>com.apple.webclip.managed</string>
      <key>PayloadUUID</key>
      <string>9B6DB8A9-9A2E-47C2-9852-B3EA5D0408CD</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>URL</key>
      <string>${currentUrl}</string>
    </dict>
  </array>
  <key>PayloadDisplayName</key>
  <string>\u0645\u0646\u0635\u0629 SchoolixiQ</string>
  <key>PayloadIdentifier</key>
  <string>com.schoolixiq.profile</string>
  <key>PayloadOrganization</key>
  <string>SchoolixiQ</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>1A3FB4D2-8A7E-41F6-9EF3-94DC2E0407EF</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>`;
    res.setHeader("Content-Type", "application/x-apple-aspen-config");
    res.setHeader("Content-Disposition", 'inline; filename="schoolixiq.mobileconfig"');
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.send(profileXML);
  });
  function sanitizeAdditionalData(data) {
    if (!data || typeof data !== "object") return {};
    const clean = { ...data };
    for (const key of Object.keys(clean)) {
      if (/password/i.test(key)) delete clean[key];
    }
    return clean;
  }
  app.post("/api/admin/create-user", verifyAdmin, async (req, res) => {
    try {
      const { email, password, displayName, role, schoolId, additionalData } = req.body || {};
      const safeAdditionalData = sanitizeAdditionalData(additionalData);
      if (!email) {
        return res.status(400).json({ error: "EMAIL_REQUIRED", message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0637\u0644\u0648\u0628" });
      }
      const targetRole = normalizeRole(role);
      if (!targetRole) {
        return res.status(400).json({ error: "ROLE_REQUIRED", message: "\u062F\u0648\u0631 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628" });
      }
      let effectiveSchoolId = schoolId ? String(schoolId).trim() : "";
      let resolvedAssistantType = null;
      if (targetRole === "assistant") {
        return res.status(400).json({
          error: "LEGACY_ASSISTANT_ROLE_FORBIDDEN",
          message: "\u0627\u0633\u062A\u062E\u062F\u0645 platform_assistant \u0623\u0648 school_assistant \u0628\u062F\u0644\u0627\u064B \u0645\u0646 assistant"
        });
      }
      if (targetRole === "platform_assistant") {
        resolvedAssistantType = "platform";
        effectiveSchoolId = "";
        safeAdditionalData.assistantType = "platform";
        delete safeAdditionalData.assistantScope;
      } else if (targetRole === "school_assistant") {
        resolvedAssistantType = "school";
        if (!effectiveSchoolId) {
          return res.status(400).json({
            error: "SCHOOL_ASSISTANT_SCHOOL_ID_REQUIRED",
            message: "\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0645\u062F\u0631\u0633\u0629 \u0645\u0637\u0644\u0648\u0628 \u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0645\u062F\u0631\u0633\u0629"
          });
        }
        safeAdditionalData.assistantType = "school";
        delete safeAdditionalData.assistantScope;
      }
      if (!canActorCreateRole(req.user.role, targetRole, req.user.schoolId)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0644\u0643 \u0628\u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0647\u0630\u0627 \u0627\u0644\u062F\u0648\u0631"
        });
      }
      if (targetRole === "platform_assistant" && req.user.role !== "superadmin") {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "\u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0645\u0646\u0635\u0629 \u0645\u0633\u0645\u0648\u062D \u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u0642\u0637"
        });
      }
      if (!canActorUseAdminApi(req.user.role, req.user.schoolId)) {
        return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0642\u064A\u0627\u0645 \u0628\u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629" });
      }
      if (req.user.role !== "superadmin") {
        if (targetRole === "platform_assistant") {
          return res.status(403).json({
            error: "FORBIDDEN",
            message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0644\u0643 \u0628\u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0645\u0646\u0635\u0629"
          });
        }
        if (!effectiveSchoolId || effectiveSchoolId !== req.user.schoolId) {
          return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0644\u0643 \u0628\u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0644\u0645\u062F\u0631\u0633\u0629 \u0623\u062E\u0631\u0649" });
        }
      }
      const emailLower = email.toLowerCase().trim();
      console.log(`Creating user: ${redactEmail(emailLower)}, role: ${role}`);
      const db = getDb();
      let uid = "";
      let isExistingUser = false;
      let existingUserData = null;
      try {
        const existingUser = await admin.auth().getUserByEmail(emailLower);
        uid = existingUser.uid;
        console.log(`User already exists in Auth: ${redactUid(uid)}`);
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists) {
          isExistingUser = true;
          existingUserData = userDoc.data();
          if (role === "parent") {
            if (existingUserData?.role && existingUserData.role !== "parent") {
              return res.status(400).json({
                error: "ROLE_CONFLICT",
                message: "\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0628\u062D\u0633\u0627\u0628 \u0645\u0648\u0638\u0641 \u0623\u0648 \u0645\u0639\u0644\u0645. \u064A\u0631\u062C\u0649 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0628\u0631\u064A\u062F \u0645\u062E\u062A\u0644\u0641 \u0644\u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631."
              });
            }
          } else {
            if (existingUserData?.schoolId && existingUserData.schoolId !== effectiveSchoolId && req.user.role !== "superadmin") {
              return res.status(400).json({
                error: "USER_ALREADY_IN_ANOTHER_SCHOOL",
                message: "\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0628\u0627\u0644\u0641\u0639\u0644 \u0644\u0645\u062F\u0631\u0633\u0629 \u0623\u062E\u0631\u0649"
              });
            }
          }
        }
        const updateParams = {
          emailVerified: true
          // Set to true since admin is creating/linking
        };
        if (password) {
          updateParams.password = password;
        } else {
          const hasPassword = existingUser.providerData.some((p) => p.providerId === "password");
          if (!hasPassword) {
            updateParams.password = crypto3.randomBytes(16).toString("hex") + "SecureP1!";
            console.log(`Setting dynamic random password for existing Google user: ${redactUid(uid)}`);
          }
        }
        if (displayName) updateParams.displayName = displayName;
        if (Object.keys(updateParams).length > 1 || updateParams.emailVerified) {
          await admin.auth().updateUser(uid, updateParams);
          console.log(`Updated existing Auth user: ${redactUid(uid)}, verified: true, hasPasswordUpd: ${!!updateParams.password}`);
        }
      } catch (authError) {
        if (authError.code === "auth/user-not-found") {
          const generatedSecurePass = crypto3.randomBytes(16).toString("hex") + "SecureP1!";
          const userRecord = await admin.auth().createUser({
            email: emailLower,
            password: password || generatedSecurePass,
            // Ensure a password is set securely
            displayName,
            emailVerified: true
          });
          uid = userRecord.uid;
          console.log(`Created new Auth user: ${redactUid(uid)}, email: ${redactEmail(emailLower)}`);
        } else {
          throw authError;
        }
      }
      if (role === "student" && effectiveSchoolId) {
        let shouldIncrement = true;
        if (isExistingUser && existingUserData?.schoolId === effectiveSchoolId && existingUserData?.role === "student") {
          shouldIncrement = false;
        }
        await db.runTransaction(async (transaction) => {
          const schoolRef = db.collection("schools").doc(effectiveSchoolId);
          const schoolSnap = await transaction.get(schoolRef);
          if (!schoolSnap.exists) throw new Error("\u0627\u0644\u0645\u062F\u0631\u0633\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
          const schoolData = schoolSnap.data();
          const currentCount = schoolData.studentCount || 0;
          const planId = schoolData.planId || "basic";
          const planDoc = await db.collection("packages").doc(planId).get();
          const maxStudents = planDoc.exists ? planDoc.data()?.maxStudents || 500 : 500;
          if (shouldIncrement && currentCount >= maxStudents) {
            throw new Error(`\u0648\u0635\u0644\u062A \u0644\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647 \u0644\u0644\u0637\u0644\u0627\u0628 (${maxStudents})`);
          }
          transaction.set(db.collection("users").doc(uid), {
            uid,
            email: emailLower,
            name: displayName,
            role: targetRole,
            schoolId: effectiveSchoolId,
            ...safeAdditionalData,
            createdAt: isExistingUser ? existingUserData.createdAt : admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          transaction.set(db.collection("students").doc(uid), {
            id: uid,
            email: emailLower,
            name: displayName,
            schoolId: effectiveSchoolId,
            ...safeAdditionalData,
            createdAt: isExistingUser ? existingUserData.createdAt : admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          if (shouldIncrement) {
            transaction.update(schoolRef, {
              studentCount: admin.firestore.FieldValue.increment(1)
            });
          }
        });
        await syncUserClaims(uid, targetRole, effectiveSchoolId, additionalData?.permissions || null);
      } else {
        await syncUserClaims(uid, targetRole, effectiveSchoolId, additionalData?.permissions || null);
        await db.collection("users").doc(uid).set({
          uid,
          email: emailLower,
          name: displayName,
          role: targetRole,
          schoolId: effectiveSchoolId,
          ...safeAdditionalData,
          createdAt: isExistingUser ? existingUserData.createdAt : admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      await logAudit(req, "CREATE_USER", { after: { email: emailLower, role: targetRole, schoolId: effectiveSchoolId, assistantType: resolvedAssistantType } });
      res.json({
        success: true,
        message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u062C\u0627\u062D",
        data: { uid }
      });
    } catch (error) {
      console.error("Create User Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Internal Server Error",
        message: error.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645"
      });
    }
  });
  app.post("/api/admin/sync-claims", verifyAdmin, async (req, res) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "UID required" });
    try {
      if (!canActorUseAdminApi(req.user.role, req.user.schoolId)) {
        return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0642\u064A\u0627\u0645 \u0628\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A" });
      }
      const db = getDb();
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      const userData = userDoc.data() || {};
      const { role, schoolId } = userData;
      if (!canActorSyncClaims(req.user.role, role, req.user.schoolId)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0644\u0643 \u0628\u0645\u0632\u0627\u0645\u0646\u0629 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645"
        });
      }
      if (req.user.role !== "superadmin") {
        if (!schoolId || schoolId !== req.user.schoolId) {
          return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0644\u0643 \u0628\u0645\u0632\u0627\u0645\u0646\u0629 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0645\u062F\u0627\u0631\u0633 \u0627\u0644\u0623\u062E\u0631\u0649" });
        }
      }
      let permissions = userData.permissions || null;
      if (!permissions && schoolId) {
        const schoolDoc = await db.collection("schools").doc(schoolId).get();
        const planId = schoolDoc.data()?.planId;
        if (planId) {
          const planDoc = await db.collection("packages").doc(planId).get();
          permissions = planDoc.data()?.permissions;
        }
      }
      await syncUserClaims(uid, role, schoolId, permissions);
      await logAudit(req, "SYNC_CLAIMS", { metadata: { targetUid: uid, role, schoolId, permissions } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/admin/plans", verifyAdmin, async (req, res) => {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "SuperAdmin access required" });
    try {
      const db = getDb();
      const plan = req.body;
      const docRef = await db.collection("packages").add({
        ...plan,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await logAudit(req, "CREATE_PLAN", { after: plan });
      res.json({ id: docRef.id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.put("/api/admin/plans/:id", verifyAdmin, async (req, res) => {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "SuperAdmin access required" });
    try {
      const db = getDb();
      const { id } = req.params;
      const beforeDoc = await db.collection("packages").doc(id).get();
      await db.collection("packages").doc(id).update({
        ...req.body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await logAudit(req, "UPDATE_PLAN", { before: beforeDoc.data() || null, after: req.body });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.delete("/api/admin/plans/:id", verifyAdmin, async (req, res) => {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "SuperAdmin access required" });
    try {
      const db = getDb();
      const { id } = req.params;
      const beforeDoc = await db.collection("packages").doc(id).get();
      await db.collection("packages").doc(id).delete();
      await logAudit(req, "DELETE_PLAN", { before: beforeDoc.data() || null });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/admin/delete-user", verifyAdmin, async (req, res) => {
    const body = req.body || {};
    const userId = String(body.userId || body.uid || "").trim();
    const confirmSuperAdminDelete = body.confirmSuperAdminDelete === true;
    const confirmSelfDelete = body.confirmSelfDelete === true;
    if (!userId) {
      return res.status(400).json({ error: "USER_ID_REQUIRED", message: "userId \u0645\u0637\u0644\u0648\u0628" });
    }
    try {
      if (!isSuperAdminRole3(req.user.role)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "\u062D\u0630\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0645\u0646 \u0644\u0648\u062D\u0629 \u0627\u0644\u0633\u0648\u0628\u0631 \u0623\u062F\u0645\u0646 \u0645\u062E\u0635\u0635 \u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u0642\u0637"
        });
      }
      const db = getDb();
      const userDoc = await db.collection("users").doc(userId).get();
      const beforeData = userDoc.exists ? userDoc.data() || {} : {};
      const targetRole = beforeData.role;
      let authExists = false;
      try {
        await admin.auth().getUser(userId);
        authExists = true;
      } catch (authError) {
        if (authError.code !== "auth/user-not-found") {
          throw authError;
        }
      }
      if (!userDoc.exists && !authExists) {
        return res.status(404).json({
          error: "USER_NOT_FOUND",
          message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A Auth \u0623\u0648 Firestore"
        });
      }
      if (isSuperAdminRole3(targetRole) && !confirmSuperAdminDelete) {
        return res.status(403).json({
          error: "CONFIRMATION_REQUIRED",
          message: "\u062D\u0630\u0641 \u062D\u0633\u0627\u0628 Super Admin \u064A\u062A\u0637\u0644\u0628 confirmSuperAdminDelete:true"
        });
      }
      if (userId === req.user.uid && !confirmSelfDelete) {
        return res.status(403).json({
          error: "CONFIRMATION_REQUIRED",
          message: "\u062D\u0630\u0641 \u062D\u0633\u0627\u0628\u0643 \u0627\u0644\u062D\u0627\u0644\u064A \u064A\u062A\u0637\u0644\u0628 confirmSelfDelete:true"
        });
      }
      const result = await runUserPermanentDelete({
        db,
        authAdmin: admin.auth(),
        adminSdk: admin,
        userId
      });
      await logAudit(req, "DELETE_USER", {
        before: userDoc.exists ? beforeData : null,
        metadata: { targetUid: userId, result }
      });
      res.json({
        ok: true,
        success: true,
        deletedAuth: result.deletedAuth,
        deletedFirestoreUser: result.deletedFirestoreUser,
        warnings: result.warnings,
        data: result,
        message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (error) {
      console.error("Delete User Error:", error);
      res.status(error.status || 500).json({
        success: false,
        ok: false,
        error: error.message || "Internal Server Error",
        message: error.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628"
      });
    }
  });
  app.post("/api/admin/delete-school", verifyAdmin, async (req, res) => {
    const { schoolId } = req.body;
    if (!schoolId) return res.status(400).json({ error: "School ID required" });
    try {
      if (req.user.role !== "superadmin") {
        return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062D\u0630\u0641 \u0627\u0644\u0645\u062F\u0631\u0633\u0629. \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621 \u0645\u062E\u0635\u0635 \u0644\u0644\u0645\u0637\u0648\u0631/SuperAdmin \u0641\u0642\u0637" });
      }
      const db = getDb();
      const usersQuery = await db.collection("users").where("schoolId", "==", schoolId).get();
      const userDeletions = usersQuery.docs.map(async (uDoc) => {
        try {
          await admin.auth().deleteUser(uDoc.id);
        } catch (e) {
        }
        await uDoc.ref.delete();
      });
      await Promise.all(userDeletions);
      const studentsQuery = await db.collection("students").where("schoolId", "==", schoolId).get();
      const studentDeletions = studentsQuery.docs.map((sDoc) => sDoc.ref.delete());
      await Promise.all(studentDeletions);
      const collectionsToCleanup = [
        "staff",
        "homework",
        "exams",
        "fees",
        "expenses",
        "logs",
        "notifications",
        "attendance",
        "announcements",
        "payroll",
        "inventory",
        "market",
        "orders",
        "payments",
        "behavior_reports",
        "behavior",
        "grades",
        "installments",
        "teacher_reports",
        "classes",
        "subscriptionRequests"
      ];
      const deleteCollectionForSchool = async (colName) => {
        try {
          const snap = await db.collection(colName).where("schoolId", "==", schoolId).get();
          if (!snap.empty) {
            const docs = snap.docs;
            const batchSize = 400;
            for (let i = 0; i < docs.length; i += batchSize) {
              const chunk = docs.slice(i, i + batchSize);
              const batch = db.batch();
              chunk.forEach((doc) => batch.delete(doc.ref));
              await batch.commit();
            }
          }
        } catch (e) {
          console.error(`Cleanup failed for ${colName}:`, e);
        }
      };
      await Promise.all(collectionsToCleanup.map((colName) => deleteCollectionForSchool(colName)));
      await db.collection("schools").doc(schoolId).delete();
      await logAudit(req, "DELETE_SCHOOL", { metadata: { targetSchoolId: schoolId } });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete School Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });
  app.post("/api/admin/schools/:schoolId/permanent-delete", verifyAdmin, async (req, res) => {
    const { schoolId } = req.params;
    const body = req.body || {};
    const confirm = body.confirm === true;
    const schoolName = body.schoolName ?? body.confirmName;
    if (!schoolId) {
      return res.status(400).json({ error: "SCHOOL_ID_REQUIRED", message: "School ID required" });
    }
    try {
      if (!isSuperAdminRole3(req.user.role)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062D\u0630\u0641 \u0627\u0644\u0645\u062F\u0631\u0633\u0629 \u0646\u0647\u0627\u0626\u064A\u0627\u064B. \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621 \u0645\u062E\u0635\u0635 \u0644\u0644SuperAdmin \u0641\u0642\u0637"
        });
      }
      const result = await runSchoolPermanentDelete({
        db: getDb(),
        authAdmin: admin.auth(),
        schoolId,
        confirm,
        schoolName: schoolName != null ? String(schoolName) : void 0,
        confirmName: body.confirmName != null ? String(body.confirmName) : void 0,
        bucket: (() => {
          try {
            return getStorage().bucket();
          } catch {
            return null;
          }
        })()
      });
      await logAudit(req, "PERMANENT_DELETE_SCHOOL", {
        metadata: { targetSchoolId: schoolId, result }
      });
      res.json({
        ok: true,
        success: true,
        schoolId: result.schoolId,
        deletedCounts: result.deletedCounts,
        warnings: result.warnings,
        summary: result
      });
    } catch (error) {
      console.error("Permanent Delete School Error:", error);
      res.status(error.status || 500).json({
        ok: false,
        error: error.message || "Internal Server Error",
        message: error.message || "\u0641\u0634\u0644 \u0627\u0644\u062D\u0630\u0641 \u0627\u0644\u0646\u0647\u0627\u0626\u064A \u0644\u0644\u0645\u062F\u0631\u0633\u0629"
      });
    }
  });
  app.post("/api/admin/messages/permanent-delete", verifyAdmin, async (req, res) => {
    try {
      if (!isSuperAdminRole3(req.user.role)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "\u0627\u0644\u062D\u0630\u0641 \u0627\u0644\u0646\u0647\u0627\u0626\u064A \u0644\u0644\u0631\u0633\u0627\u0626\u0644 \u0645\u0633\u0645\u0648\u062D \u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u0642\u0637"
        });
      }
      const messageId = String(req.body?.messageId || "").trim();
      if (!messageId) {
        return res.status(400).json({ error: "MESSAGE_ID_REQUIRED", message: "\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0645\u0637\u0644\u0648\u0628" });
      }
      let bucket = null;
      try {
        bucket = getStorage().bucket();
      } catch {
        bucket = null;
      }
      const result = await permanentlyDeleteMessage(getDb(), {
        messageId,
        deletedBy: req.user.uid,
        bucket
      });
      if (!result.ok) {
        return res.status(404).json({ error: result.error || "NOT_FOUND", message: "\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      }
      await logAudit(req, "DELETE_MESSAGE", {
        metadata: {
          messageId,
          targetConversation: result.conversationId,
          conversationDeleted: result.conversationDeleted
        }
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Permanent Delete Message Error:", error);
      res.status(500).json({
        error: error.message || "Internal Server Error",
        message: error.message || "\u0641\u0634\u0644 \u0627\u0644\u062D\u0630\u0641 \u0627\u0644\u0646\u0647\u0627\u0626\u064A \u0644\u0644\u0631\u0633\u0627\u0644\u0629"
      });
    }
  });
  app.post("/api/admin/messages/purge-user-conversations", verifyAdmin, async (req, res) => {
    try {
      if (!isSuperAdminRole3(req.user.role)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "\u0627\u0644\u062D\u0630\u0641 \u0627\u0644\u0646\u0647\u0627\u0626\u064A \u0644\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0645\u0633\u0645\u0648\u062D \u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u0642\u0637"
        });
      }
      const targetUserId = String(req.body?.targetUserId || "").trim();
      const confirm = String(req.body?.confirm || "").trim();
      if (!targetUserId) {
        return res.status(400).json({ error: "TARGET_USER_REQUIRED", message: "\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628" });
      }
      if (confirm !== "DELETE") {
        return res.status(400).json({
          error: "CONFIRM_REQUIRED",
          message: "\u064A\u062C\u0628 \u0643\u062A\u0627\u0628\u0629 DELETE \u0644\u0644\u062A\u0623\u0643\u064A\u062F"
        });
      }
      let bucket = null;
      try {
        bucket = getStorage().bucket();
      } catch {
        bucket = null;
      }
      const result = await purgeUserConversations(getDb(), targetUserId, {
        bucket,
        actorId: req.user.uid
      });
      await logAudit(req, "PURGE_USER_CONVERSATIONS", {
        metadata: {
          targetUserId,
          deletedConversations: result.deleted.conversations,
          deletedMessages: result.deleted.system_messages,
          deletedNotifications: result.deleted.notifications
        }
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Purge User Conversations Error:", error);
      res.status(500).json({
        error: error.message || "Internal Server Error",
        message: error.message || "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645"
      });
    }
  });
  app.post("/api/admin/messages/authorize-conversation", verifyAdmin, async (req, res) => {
    try {
      const conversationId = String(req.body?.conversationId || "").trim();
      if (!conversationId) {
        return res.status(400).json({ error: "CONVERSATION_ID_REQUIRED" });
      }
      const db = getDb();
      const convSnap = await db.collection("conversations").doc(conversationId).get();
      const conversation = convSnap.exists ? { id: convSnap.id, ...convSnap.data() || {} } : { conversationId, id: conversationId };
      let permissions = req.user.permissions || null;
      if (!permissions) {
        const userSnap = await db.collection("users").doc(req.user.uid).get();
        permissions = userSnap.data()?.permissions || [];
      }
      const allowed = authorizeConversationAccess(
        {
          uid: req.user.uid,
          role: req.user.role,
          schoolId: req.user.schoolId,
          permissions
        },
        conversation
      );
      if (!allowed) {
        return res.status(403).json({
          error: "FORBIDDEN",
          allowed: false,
          message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629"
        });
      }
      res.json({ success: true, allowed: true, conversation });
    } catch (error) {
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });
  app.post("/api/public/distributors/register", async (req, res) => {
    const body = req.body || {};
    try {
      const result = await registerDistributorApplication(getDb(), admin, {
        name: body.name,
        phone: body.phone,
        address: body.address,
        governorate: body.governorate,
        email: body.email
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(error.code === "PHONE_ALREADY_REGISTERED" || error.code === "EMAIL_ALREADY_REGISTERED" ? 409 : 400).json({
        error: error.code || "REGISTER_FAILED",
        message: error.message || "\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0637\u0644\u0628 \u0627\u0644\u0645\u0648\u0632\u0639"
      });
    }
  });
  app.get("/api/admin/distributors/pending", verifyAdmin, async (req, res) => {
    try {
      if (!isSuperAdminRole3(req.user.role)) {
        return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
      }
      const items = await listPendingDistributors(getDb());
      res.json({ ok: true, items });
    } catch (error) {
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });
  app.post("/api/admin/distributors/approve", verifyAdmin, async (req, res) => {
    const distributorId = String(req.body?.distributorId || "").trim();
    const password = req.body?.password;
    if (!distributorId) {
      return res.status(400).json({ error: "DISTRIBUTOR_ID_REQUIRED", message: "distributorId \u0645\u0637\u0644\u0648\u0628" });
    }
    try {
      if (!isSuperAdminRole3(req.user.role)) {
        return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
      }
      const result = await approveDistributor({
        db: getDb(),
        authAdmin: admin.auth(),
        adminSdk: admin,
        distributorId,
        actorUid: req.user.uid,
        password,
        syncClaims: syncUserClaims
      });
      await logAudit(req, "DISTRIBUTOR_APPROVE", { metadata: { distributorId, result } });
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(error.code === "DISTRIBUTOR_NOT_FOUND" ? 404 : 400).json({
        error: error.code || "APPROVE_FAILED",
        message: error.message || "\u0641\u0634\u0644 \u0642\u0628\u0648\u0644 \u0627\u0644\u0645\u0648\u0632\u0639"
      });
    }
  });
  app.post("/api/admin/distributors/reject", verifyAdmin, async (req, res) => {
    const distributorId = String(req.body?.distributorId || "").trim();
    const reason = req.body?.reason;
    if (!distributorId) {
      return res.status(400).json({ error: "DISTRIBUTOR_ID_REQUIRED", message: "distributorId \u0645\u0637\u0644\u0648\u0628" });
    }
    try {
      if (!isSuperAdminRole3(req.user.role)) {
        return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
      }
      const result = await rejectDistributor({
        db: getDb(),
        adminSdk: admin,
        distributorId,
        actorUid: req.user.uid,
        reason
      });
      await logAudit(req, "DISTRIBUTOR_REJECT", { metadata: { distributorId, result } });
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(error.code === "DISTRIBUTOR_NOT_FOUND" ? 404 : 400).json({
        error: error.code || "REJECT_FAILED",
        message: error.message || "\u0641\u0634\u0644 \u0631\u0641\u0636 \u0627\u0644\u0645\u0648\u0632\u0639"
      });
    }
  });
  app.post("/api/admin/distributors/apply-coupon", verifyAdmin, async (req, res) => {
    const body = req.body || {};
    const schoolId = String(body.schoolId || "").trim();
    const couponCode = String(body.couponCode || "").trim();
    if (!schoolId || !couponCode) {
      return res.status(400).json({
        error: "INVALID_BODY",
        message: "schoolId \u0648 couponCode \u0645\u0637\u0644\u0648\u0628\u0627\u0646"
      });
    }
    try {
      if (!isSuperAdminRole3(req.user.role)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "\u0631\u0628\u0637 \u0643\u0648\u0628\u0648\u0646 \u0627\u0644\u0645\u0648\u0632\u0639 \u0645\u062E\u0635\u0635 \u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u0642\u0637"
        });
      }
      const result = await applyDistributorCoupon({
        db: getDb(),
        adminSdk: admin,
        schoolId,
        couponCode,
        actorUid: req.user.uid
      });
      await logAudit(req, "DISTRIBUTOR_APPLY_COUPON", {
        metadata: { schoolId, couponCode, result }
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      const code = error.code || "APPLY_COUPON_FAILED";
      res.status(code === "SCHOOL_NOT_FOUND" || code === "COUPON_INVALID" ? 404 : 400).json({
        error: code,
        message: error.message || "\u0641\u0634\u0644 \u0631\u0628\u0637 \u0627\u0644\u0643\u0648\u0628\u0648\u0646"
      });
    }
  });
  app.post("/api/admin/distributors/generate-monthly-commissions", verifyAdmin, async (req, res) => {
    const monthKey = String(req.body?.monthKey || "").trim();
    if (!monthKey) {
      return res.status(400).json({
        error: "MONTH_KEY_REQUIRED",
        message: "monthKey \u0645\u0637\u0644\u0648\u0628 (\u0645\u062B\u0627\u0644: 2026-07)"
      });
    }
    try {
      if (!isSuperAdminRole3(req.user.role)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "\u062A\u0648\u0644\u064A\u062F \u0627\u0644\u0639\u0645\u0648\u0644\u0627\u062A \u0627\u0644\u0634\u0647\u0631\u064A\u0629 \u0645\u062E\u0635\u0635 \u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u0642\u0637"
        });
      }
      const counts = await generateMonthlyCommissions({
        db: getDb(),
        adminSdk: admin,
        monthKey
      });
      await logAudit(req, "DISTRIBUTOR_GENERATE_MONTHLY", {
        metadata: { monthKey, counts }
      });
      res.json({ ok: true, ...counts });
    } catch (error) {
      res.status(400).json({
        error: error.code || "GENERATE_FAILED",
        message: error.message || "\u0641\u0634\u0644 \u062A\u0648\u0644\u064A\u062F \u0627\u0644\u0639\u0645\u0648\u0644\u0627\u062A"
      });
    }
  });
  app.post("/api/admin/distributors/commissions/:commissionId/mark-paid", verifyAdmin, async (req, res) => {
    const { commissionId } = req.params;
    const notes = req.body?.notes;
    try {
      if (!isSuperAdminRole3(req.user.role)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u0643\u0645\u062F\u0641\u0648\u0639\u0629 \u0645\u062E\u0635\u0635 \u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u0642\u0637"
        });
      }
      const result = await markCommissionPaid({
        db: getDb(),
        adminSdk: admin,
        commissionId,
        paidBy: req.user.uid,
        notes
      });
      await logAudit(req, "DISTRIBUTOR_COMMISSION_PAID", {
        metadata: { commissionId, result }
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(error.code === "COMMISSION_NOT_FOUND" ? 404 : 400).json({
        error: error.code || "MARK_PAID_FAILED",
        message: error.message || "\u0641\u0634\u0644 \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u0643\u0645\u062F\u0641\u0648\u0639\u0629"
      });
    }
  });
  app.post("/api/admin/distributors/:distributorId/commissions/mark-paid", verifyAdmin, async (req, res) => {
    const { distributorId } = req.params;
    const monthKey = String(req.body?.monthKey || "").trim();
    const notes = req.body?.notes;
    if (!monthKey) {
      return res.status(400).json({
        error: "MONTH_KEY_REQUIRED",
        message: "monthKey \u0645\u0637\u0644\u0648\u0628"
      });
    }
    try {
      if (!isSuperAdminRole3(req.user.role)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "\u062A\u0639\u0644\u064A\u0645 \u0639\u0645\u0648\u0644\u0627\u062A \u0627\u0644\u0645\u0648\u0632\u0639 \u0643\u0645\u062F\u0641\u0648\u0639\u0629 \u0645\u062E\u0635\u0635 \u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u0642\u0637"
        });
      }
      const result = await markDistributorMonthCommissionsPaid({
        db: getDb(),
        adminSdk: admin,
        distributorId,
        monthKey,
        paidBy: req.user.uid,
        notes
      });
      await logAudit(req, "DISTRIBUTOR_MONTH_PAID", {
        metadata: { distributorId, monthKey, result }
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({
        error: error.code || "MARK_PAID_FAILED",
        message: error.message || "\u0641\u0634\u0644 \u062A\u0639\u0644\u064A\u0645 \u0639\u0645\u0648\u0644\u0627\u062A \u0627\u0644\u0634\u0647\u0631 \u0643\u0645\u062F\u0641\u0648\u0639\u0629"
      });
    }
  });
  app.post("/api/admin/schools/:schoolId/distributor-commission-pause", verifyAdmin, async (req, res) => {
    const { schoolId } = req.params;
    const paused = req.body?.paused === true;
    try {
      if (!isSuperAdminRole3(req.user.role)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "\u0625\u064A\u0642\u0627\u0641 \u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0645\u0648\u0632\u0639 \u0645\u062E\u0635\u0635 \u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u0642\u0637"
        });
      }
      const result = await setSchoolDistributorCommissionPaused({
        db: getDb(),
        adminSdk: admin,
        schoolId,
        paused,
        pausedBy: req.user.uid
      });
      await logAudit(req, paused ? "DISTRIBUTOR_COMMISSION_PAUSE" : "DISTRIBUTOR_COMMISSION_RESUME", {
        metadata: { schoolId, paused }
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(error.code === "SCHOOL_NOT_FOUND" ? 404 : 400).json({
        error: error.code || "PAUSE_FAILED",
        message: error.message || "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0645\u0648\u0632\u0639"
      });
    }
  });
  app.post("/api/admin/delete-student", verifyAdmin, async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Student ID required" });
    try {
      if (!canActorDeleteStudent(req.user.role, req.user.schoolId)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0644\u0643 \u0628\u062D\u0630\u0641 \u0627\u0644\u0637\u0644\u0627\u0628"
        });
      }
      const db = getDb();
      const studentDoc = await db.collection("students").doc(id).get();
      const beforeData = studentDoc.exists ? studentDoc.data() : null;
      const schoolId = beforeData?.schoolId;
      if (req.user.role !== "superadmin") {
        if (!schoolId || schoolId !== req.user.schoolId) {
          return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0644\u0643 \u0628\u062D\u0630\u0641 \u0637\u0644\u0627\u0628 \u0645\u062F\u0631\u0633\u0629 \u0623\u062E\u0631\u0649" });
        }
      }
      await db.runTransaction(async (transaction) => {
        transaction.delete(db.collection("students").doc(id));
        transaction.delete(db.collection("users").doc(id));
        if (schoolId) {
          transaction.update(db.collection("schools").doc(schoolId), {
            studentCount: admin.firestore.FieldValue.increment(-1)
          });
        }
      });
      try {
        await admin.auth().deleteUser(id);
      } catch (authError) {
      }
      await logAudit(req, "DELETE_STUDENT", { before: beforeData, metadata: { targetId: id } });
      res.json({
        success: true,
        message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0637\u0627\u0644\u0628 \u0628\u0646\u062C\u0627\u062D",
        data: { id }
      });
    } catch (error) {
      console.error("Delete Student Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Internal Server Error",
        message: error.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062D\u0630\u0641 \u0627\u0644\u0637\u0627\u0644\u0628"
      });
    }
  });
  app.post("/api/admin/backup", verifyAdmin, async (req, res) => {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "SuperAdmin access required" });
    try {
      const db = getDb();
      const collectionsToBackup = ["schools", "users", "students", "classes", "packages", "orders", "payments", "installments", "grades", "attendance_records"];
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=schoolixiq_backup_" + (/* @__PURE__ */ new Date()).toISOString().split("T")[0] + ".json");
      res.write("{\n");
      res.write('  "timestamp": "' + (/* @__PURE__ */ new Date()).toISOString() + '",\n');
      res.write('  "collections": {\n');
      for (let i = 0; i < collectionsToBackup.length; i++) {
        const collName = collectionsToBackup[i];
        res.write('    "' + collName + '": [\n');
        let lastDoc = null;
        let hasMore = true;
        let isFirstInColl = true;
        while (hasMore) {
          let query = db.collection(collName).orderBy(admin.firestore.FieldPath.documentId()).limit(1e3);
          if (lastDoc) {
            query = query.startAfter(lastDoc);
          }
          const snap = await query.get();
          if (snap.empty) {
            hasMore = false;
            break;
          }
          const docs = snap.docs;
          lastDoc = docs[docs.length - 1];
          if (docs.length < 1e3) {
            hasMore = false;
          }
          for (const doc of docs) {
            if (!isFirstInColl) {
              res.write(",\n");
            }
            res.write("      " + JSON.stringify({ id: doc.id, ...doc.data() }));
            isFirstInColl = false;
          }
        }
        res.write("\n    ]");
        if (i < collectionsToBackup.length - 1) {
          res.write(",\n");
        } else {
          res.write("\n");
        }
      }
      res.write("  }\n");
      res.write("}\n");
      res.end();
      await logAudit(req, "MANUAL_BACKUP", { metadata: { collectionsCount: collectionsToBackup.length } });
    } catch (error) {
      console.error("Backup Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Internal Server Error" });
      }
    }
  });
  app.post("/api/internal/tuition-reminders/run", express.json(), async (req, res) => {
    const secret = resolveCronSecret(process.env.TUITION_CRON_SECRET, process.env.CRON_SECRET);
    if (!secret || req.headers["x-cron-secret"] !== secret) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    try {
      const db = getDb();
      const targetSchoolId = req.body?.schoolId;
      let schoolDocs = [];
      if (targetSchoolId) {
        const snap = await db.collection("schools").doc(targetSchoolId).get();
        if (snap.exists) schoolDocs = [snap];
      } else {
        const snap = await db.collection("schools").where("status", "==", "active").limit(200).get();
        schoolDocs = snap.docs;
      }
      const scheduled = [];
      for (const doc of schoolDocs) {
        const settings = doc.data()?.tuitionReminderSettings || {};
        scheduled.push({
          schoolId: doc.id,
          autoEnabled: Boolean(settings.autoRemindersEnabled && settings.enabled !== false)
        });
      }
      res.json({
        success: true,
        message: "Scheduler endpoint ready. Deploy Cloud Scheduler (daily) POST with X-Cron-Secret. Automatic sends execute via runAutomaticTuitionRemindersForSchool (Firestore client) or extend this endpoint with firebase-admin send pipeline.",
        schoolsChecked: scheduled.length,
        autoEnabledSchools: scheduled.filter((s) => s.autoEnabled).map((s) => s.schoolId),
        setupRequired: [
          "Set TUITION_CRON_SECRET on Cloud Run",
          "Cloud Scheduler \u2192 POST /api/internal/tuition-reminders/run",
          "Enable autoRemindersEnabled per school in Tuition Reminders settings"
        ]
      });
    } catch (error) {
      console.error("[TuitionCron] error", error);
      res.status(500).json({ success: false, error: error.message || "Cron handler failed" });
    }
  });
  app.post("/api/internal/notifications/push-dispatch", express.json(), async (req, res) => {
    const secret = resolveCronSecret(process.env.NOTIFICATION_CRON_SECRET, process.env.CRON_SECRET);
    if (!secret || req.headers["x-cron-secret"] !== secret) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    try {
      const db = getDb();
      const limit = Math.min(Number(req.body?.limit) || 50, 100);
      const results = await pollRecentNotificationsForPush(db, admin, limit);
      res.json({
        success: true,
        processed: results.length,
        results,
        note: "For real-time push, deploy Cloud Function onCreate(notifications) OR run this server on Cloud Run with FCM listener."
      });
    } catch (error) {
      console.error("[Notifications] PUSH_SEND_ERROR poll", error);
      res.status(500).json({ success: false, error: error.message || "Push poll failed" });
    }
  });
  app.all("/api/*", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.url}`,
      message: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u063A\u064A\u0631 \u0645\u0639\u0631\u0641 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645"
    });
  });
  app.use("/api/*", (err, req, res, next) => {
    console.error("Unhandled API Error:", err);
    res.setHeader("Content-Type", "application/json");
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.name || "InternalServerError",
      message: err.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use("/assets", express.static(path.join(distPath, "assets"), {
      maxAge: "1y",
      immutable: true,
      fallthrough: false
    }));
    app.use(express.static(distPath, {
      maxAge: "1d",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else if (filePath.match(/\.(js|css|woff2?|ico|png|jpe?g|gif|svg)$/)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    try {
      const db = getDb();
      setupNotificationPushListener(db, admin);
    } catch (e) {
      console.error("[Notifications] PUSH_SEND_ERROR gateway init:", e.message);
    }
    const isProductionEnv2 = process.env.NODE_ENV === "production";
    const isDevUrl = process.env.APP_URL && (process.env.APP_URL.includes("-dev-") || process.env.APP_URL.includes("localhost") || process.env.APP_URL.includes("127.0.0.1"));
    if (process.env.APP_URL) {
      try {
        const db = getDb();
        const appUrlClean = process.env.APP_URL.replace(/\/$/, "");
        if (isProductionEnv2 && !isDevUrl) {
          await db.collection("system").doc("config").set({
            appUrl: appUrlClean,
            appUrlProd: appUrlClean
          }, { merge: true });
          console.log(`Successfully saved production APP_URL (${appUrlClean}) to system/config.`);
        } else {
          await db.collection("system").doc("config").set({
            appUrlDev: appUrlClean
          }, { merge: true });
          console.log(`Successfully saved development APP_URL (${appUrlClean}) to system/config (appUrlDev).`);
        }
      } catch (err) {
        console.error("Failed to save APP_URL to system/config:", err.message);
      }
    }
  });
}
startServer();
