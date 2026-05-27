var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_firestore = require("firebase-admin/firestore");
var import_storage = require("firebase-admin/storage");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var firebaseConfigPath = import_path.default.join(__dirname, "firebase-applet-config.json");
var firebaseConfig = { projectId: "" };
if (import_fs.default.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(import_fs.default.readFileSync(firebaseConfigPath, "utf8"));
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
    import_firebase_admin.default.initializeApp({
      credential: import_firebase_admin.default.credential.cert(serviceAccount),
      storageBucket: firebaseConfig.storageBucket
      // Added
    });
    console.log("Firebase Admin initialized with service account.");
  } catch (e) {
    console.error("Firebase Admin Initialization Error");
  }
} else {
  try {
    import_firebase_admin.default.initializeApp({
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
  if (import_firebase_admin.default.apps.length === 0) {
    return (0, import_firestore.getFirestore)();
  }
  return (0, import_firestore.getFirestore)(import_firebase_admin.default.app(), dbId || "(default)");
};
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  const logAudit = async (req, action, details) => {
    try {
      const db = getDb();
      const user = req.user || {};
      await db.collection("audit_logs").add({
        action,
        performedBy: user.email || "system",
        uid: user.uid || "system",
        schoolId: user.schoolId || "system",
        ip: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
        details,
        timestamp: import_firebase_admin.default.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error("Audit Log Error:", error);
    }
  };
  const getBootstrapAdmins = () => {
    const admins = process.env.BOOTSTRAP_ADMIN_EMAILS || "hamzakazem1999@gmail.com";
    return admins.toLowerCase().split(",").map((e) => e.trim());
  };
  const syncUserClaims = async (uid, role, schoolId, permissions) => {
    try {
      const securityVersion = 4;
      await import_firebase_admin.default.auth().setCustomUserClaims(uid, {
        role,
        schoolId: schoolId || "",
        sv: securityVersion,
        p: permissions || null
        // Optional permissions snapshot
      });
      await import_firebase_admin.default.auth().revokeRefreshTokens(uid);
      console.log(`Claims synced & tokens revoked for user ${uid}: role=${role}, sv=${securityVersion}`);
    } catch (error) {
      console.error(`Error setting claims for user ${uid}:`, error);
    }
  };
  const verifyAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await import_firebase_admin.default.auth().verifyIdToken(token);
      const email = decodedToken.email?.toLowerCase();
      const isBootstrapAdmin = getBootstrapAdmins().includes(email) && decodedToken.email_verified === true;
      if (isBootstrapAdmin && decodedToken.role !== "superadmin") {
        await syncUserClaims(decodedToken.uid, "superadmin");
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
      const allowedRoles = ["admin", "superadmin", "staff", "assistant"];
      const hasAdminRights = allowedRoles.includes(role);
      if (!hasAdminRights) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }
      if (role !== "superadmin" && role !== "admin" && !decodedToken.email_verified) {
        return res.status(403).json({ error: "EMAIL_NOT_VERIFIED", message: "\u064A\u0631\u062C\u0649 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0644\u0644\u0642\u064A\u0627\u0645 \u0628\u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064A\u0629" });
      }
      if (role !== "superadmin" && schoolId) {
        const db = getDb();
        const schoolDoc = await db.collection("schools").doc(schoolId).get();
        if (schoolDoc.exists) {
          const expirationData = schoolDoc.data()?.subscriptionExpiresAt;
          if (expirationData && new Date(expirationData) < /* @__PURE__ */ new Date()) {
            return res.status(402).json({ error: "SUBSCRIPTION_EXPIRED", message: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0634\u062A\u0631\u0627\u0643 \u0627\u0644\u0645\u062F\u0631\u0633\u0629" });
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
  app.post("/api/upload", import_express.default.json({ limit: "20mb" }), async (req, res) => {
    try {
      const { path: storagePath, base64 } = req.body;
      if (!storagePath || !base64) return res.status(400).json({ error: "Missing path or base64" });
      try {
        const bucket = (0, import_storage.getStorage)().bucket();
        const file = bucket.file(storagePath);
        const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const token = Date.now() + Math.random().toString(36).substring(2);
        await file.save(buffer, {
          metadata: {
            contentType: "image/jpeg",
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
  app.post("/api/admin/create-user", verifyAdmin, async (req, res) => {
    const { email, password, displayName, role, schoolId, additionalData } = req.body;
    const emailLower = email.toLowerCase().trim();
    console.log(`Creating user: ${emailLower}, role: ${role}`);
    try {
      const db = getDb();
      let uid = "";
      try {
        const existingUser = await import_firebase_admin.default.auth().getUserByEmail(emailLower);
        uid = existingUser.uid;
        console.log(`User already exists in Auth: ${uid}`);
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.schoolId && userData.schoolId !== schoolId && req.user.role !== "superadmin") {
            return res.status(400).json({
              error: "USER_ALREADY_IN_ANOTHER_SCHOOL",
              message: "\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0628\u0627\u0644\u0641\u0639\u0644 \u0644\u0645\u062F\u0631\u0633\u0629 \u0623\u062E\u0631\u0649"
            });
          }
          const isManagement = ["admin", "staff", "assistant", "superadmin"].includes(userData?.role);
          const requestedIsRestricted = ["teacher", "parent"].includes(role);
          if (isManagement && requestedIsRestricted) {
            return res.status(400).json({
              error: "ROLE_CONFLICT",
              message: "\u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0633\u062C\u0644 \u0643\u0625\u062F\u0627\u0631\u0629 \u0645\u062F\u0631\u0633\u0629 \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0647 \u0643\u0645\u0639\u0644\u0645 \u0623\u0648 \u0648\u0644\u064A \u0623\u0645\u0631 \u0628\u0646\u0641\u0633 \u0627\u0644\u0628\u0631\u064A\u062F"
            });
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
            updateParams.password = "Parent123!";
            console.log(`Setting default password for existing Google user: ${uid}`);
          }
        }
        if (displayName) updateParams.displayName = displayName;
        if (Object.keys(updateParams).length > 1 || updateParams.emailVerified) {
          await import_firebase_admin.default.auth().updateUser(uid, updateParams);
          console.log(`Updated existing Auth user: ${uid}, verified: true, hasPasswordUpd: ${!!updateParams.password}`);
        }
      } catch (authError) {
        if (authError.code === "auth/user-not-found") {
          const userRecord = await import_firebase_admin.default.auth().createUser({
            email: emailLower,
            password: password || "Parent123!",
            // Ensure a password is set
            displayName,
            emailVerified: true
          });
          uid = userRecord.uid;
          console.log(`Created new Auth user: ${uid}, email: ${emailLower}`);
        } else {
          throw authError;
        }
      }
      if (uid) {
        await import_firebase_admin.default.auth().setCustomUserClaims(uid, {
          role,
          schoolId
        });
        console.log(`Set custom claims for user ${uid}: role=${role}, schoolId=${schoolId}`);
      }
      if (role === "student" && schoolId) {
        await db.runTransaction(async (transaction) => {
          const schoolRef = db.collection("schools").doc(schoolId);
          const schoolSnap = await transaction.get(schoolRef);
          if (!schoolSnap.exists) throw new Error("\u0627\u0644\u0645\u062F\u0631\u0633\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
          const schoolData = schoolSnap.data();
          const currentCount = schoolData.studentCount || 0;
          const planId = schoolData.planId || "basic";
          const planDoc = await db.collection("packages").doc(planId).get();
          const maxStudents = planDoc.exists ? planDoc.data()?.maxStudents || 500 : 500;
          if (currentCount >= maxStudents) {
            throw new Error(`\u0648\u0635\u0644\u062A \u0644\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647 \u0644\u0644\u0637\u0644\u0627\u0628 (${maxStudents})`);
          }
          await syncUserClaims(uid, role, schoolId);
          transaction.set(db.collection("users").doc(uid), {
            uid,
            email: emailLower,
            name: displayName,
            role,
            schoolId,
            ...additionalData,
            createdAt: import_firebase_admin.default.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          transaction.update(schoolRef, {
            studentCount: import_firebase_admin.default.firestore.FieldValue.increment(1)
          });
        });
      } else {
        await syncUserClaims(uid, role, schoolId, additionalData?.permissions || null);
        await db.collection("users").doc(uid).set({
          uid,
          email: emailLower,
          name: displayName,
          role,
          schoolId,
          ...additionalData,
          createdAt: import_firebase_admin.default.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      await logAudit(req, "CREATE_USER", { after: { email: emailLower, role, schoolId } });
      res.json({ uid });
    } catch (error) {
      console.error("Create User Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });
  app.post("/api/admin/sync-claims", verifyAdmin, async (req, res) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "UID required" });
    try {
      const db = getDb();
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      const userData = userDoc.data() || {};
      const { role, schoolId } = userData;
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
        createdAt: import_firebase_admin.default.firestore.FieldValue.serverTimestamp()
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
        updatedAt: import_firebase_admin.default.firestore.FieldValue.serverTimestamp()
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
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "UID required" });
    try {
      const db = getDb();
      const userDoc = await db.collection("users").doc(uid).get();
      const beforeData = userDoc.exists ? userDoc.data() : null;
      try {
        await import_firebase_admin.default.auth().deleteUser(uid);
      } catch (authError) {
        if (authError.code === "auth/user-not-found") {
          console.log(`User ${uid} already removed from Auth.`);
        } else {
          console.warn(`Failed to delete user ${uid} from Auth:`, authError.message);
        }
      }
      await db.collection("users").doc(uid).delete();
      const studentsSnap = await db.collection("students").where("parentIds", "array-contains", uid).get();
      if (!studentsSnap.empty) {
        const batch = db.batch();
        studentsSnap.docs.forEach((doc) => {
          batch.update(doc.ref, {
            parentIds: import_firebase_admin.default.firestore.FieldValue.arrayRemove(uid)
          });
        });
        await batch.commit();
      }
      await logAudit(req, "DELETE_USER", { before: beforeData, metadata: { targetUid: uid } });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete User Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });
  app.post("/api/admin/delete-student", verifyAdmin, async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Student ID required" });
    try {
      const db = getDb();
      const studentDoc = await db.collection("students").doc(id).get();
      const beforeData = studentDoc.exists ? studentDoc.data() : null;
      const schoolId = beforeData?.schoolId;
      await db.runTransaction(async (transaction) => {
        transaction.delete(db.collection("students").doc(id));
        transaction.delete(db.collection("users").doc(id));
        if (schoolId) {
          transaction.update(db.collection("schools").doc(schoolId), {
            studentCount: import_firebase_admin.default.firestore.FieldValue.increment(-1)
          });
        }
      });
      try {
        await import_firebase_admin.default.auth().deleteUser(id);
      } catch (authError) {
      }
      await logAudit(req, "DELETE_STUDENT", { before: beforeData, metadata: { targetId: id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete Student Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });
  app.post("/api/admin/backup", verifyAdmin, async (req, res) => {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "SuperAdmin access required" });
    try {
      const db = getDb();
      const collectionsToBackup = ["schools", "users", "students", "classes", "packages", "orders", "payments", "installments", "grades", "attendance_records"];
      const backupData = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        collections: {}
      };
      for (const collName of collectionsToBackup) {
        const snap = await db.collection(collName).get();
        backupData.collections[collName] = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      }
      await logAudit(req, "MANUAL_BACKUP", { metadata: { collectionsCount: collectionsToBackup.length } });
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=schoolixiq_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`);
      res.send(JSON.stringify(backupData));
    } catch (error) {
      console.error("Backup Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
