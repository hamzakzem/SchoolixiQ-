// ../server.ts
import express from "express";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import dotEnv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import { runSchoolPermanentDelete } from "./schoolPermanentDelete.mjs";
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
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3e3;
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
      await db.collection("audit_logs").add({
        action,
        performedBy: user.email || "system",
        uid: user.uid || "system",
        schoolId: user.schoolId || "system",
        ip: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
        details: sanitizedDetails,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
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
      const claims = {
        role,
        schoolId: schoolId || "",
        sv: securityVersion,
        p: permissions || null
        // Optional permissions snapshot
      };
      const claimsStr = JSON.stringify(claims);
      if (Buffer.byteLength(claimsStr, "utf8") > 900) {
        console.warn(`[SECURITY] Custom claims size (${Buffer.byteLength(claimsStr, "utf8")} bytes) exceeds limit for UID: ${uid}. Stripping nested permissions 'p' to avoid claims exception.`);
        claims.p = null;
      }
      await admin.auth().setCustomUserClaims(uid, claims);
      console.log(`Claims synced for user ${uid}: role=${role}, sv=${securityVersion}`);
    } catch (error) {
      console.error(`Error setting claims for user ${uid}:`, error);
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
      const allowedRoles = ["admin", "superadmin", "staff", "assistant"];
      const hasAdminRights = allowedRoles.includes(role);
      if (!hasAdminRights) {
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
  const STUDENT_PHOTO_STAFF_ROLES = [
    "superadmin",
    "super_admin",
    "admin",
    "school_admin",
    "assistant",
    "staff",
    "teacher"
  ];
  const isSuperAdminRole = (role) => role === "superadmin" || role === "super_admin";
  async function assertUploadPathAllowed(uid, storagePath, tokenUser) {
    const db = getDb();
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return null;
    }
    const userData = userDoc.data() || {};
    const tokenRole = String(tokenUser?.role || "");
    const tokenSchoolId = String(tokenUser?.schoolId || "");
    const role = String(userData.role || tokenRole || "");
    const schoolId = String(userData.schoolId || tokenSchoolId || "");
    const studentMatch = storagePath.match(/^students\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (studentMatch) {
      const pathSchoolId = studentMatch[1];
      const fileName = studentMatch[3];
      if (!STUDENT_PHOTO_STAFF_ROLES.includes(role)) {
        throw Object.assign(new Error("FORBIDDEN_ROLE"), { status: 403 });
      }
      if (!isSuperAdminRole(role) && schoolId !== pathSchoolId) {
        throw Object.assign(new Error("FORBIDDEN_SCHOOL"), { status: 403 });
      }
      if (!/^photo_\d+\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
        throw Object.assign(new Error("INVALID_STUDENT_PHOTO_PATH"), { status: 400 });
      }
      return { role, schoolId };
    }
    return { role, schoolId };
  }
  app.post("/api/upload", verifyToken, express.json({ limit: "20mb" }), async (req, res) => {
    try {
      const { path: storagePath, base64 } = req.body;
      if (!storagePath || !base64) return res.status(400).json({ error: "Missing path or base64" });
      try {
        const allowed = await assertUploadPathAllowed(req.user.uid, storagePath, req.user);
        if (!allowed) {
          return res.status(403).json({
            error: "FORBIDDEN",
            message: "\u0645\u0644\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0647 \u0628\u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631"
          });
        }
      } catch (authzError) {
        const status = authzError.status || 403;
        const code = authzError.message || "FORBIDDEN";
        const message = code === "FORBIDDEN_SCHOOL" ? "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0631\u0641\u0639 \u0635\u0648\u0631 \u0644\u0645\u062F\u0631\u0633\u0629 \u0623\u062E\u0631\u0649" : code === "FORBIDDEN_ROLE" ? "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0631\u0641\u0639 \u0635\u0648\u0631 \u0627\u0644\u0637\u0644\u0627\u0628" : "\u0645\u0633\u0627\u0631 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D";
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
      const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".mp3", ".m4a", ".wav", ".json", ".mobileconfig"];
      const ext = path.extname(storagePath).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        return res.status(400).json({
          error: "INVALID_FILE_TYPE",
          message: "\u0646\u0648\u0639 \u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0645\u0646\u0635\u0629 \u0644\u0623\u0633\u0628\u0627\u0628 \u0623\u0645\u0646\u064A\u0629."
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
        const token = crypto.randomUUID();
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
      const allowedAdminRoles = ["superadmin", "admin", "staff", "assistant"];
      if (!allowedAdminRoles.includes(req.user.role)) {
        return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0642\u064A\u0627\u0645 \u0628\u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629" });
      }
      if (req.user.role !== "superadmin") {
        if (!schoolId || schoolId !== req.user.schoolId) {
          return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0644\u0643 \u0628\u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0644\u0645\u062F\u0631\u0633\u0629 \u0623\u062E\u0631\u0649" });
        }
      }
      const emailLower = email.toLowerCase().trim();
      console.log(`Creating user: ${emailLower}, role: ${role}`);
      const db = getDb();
      let uid = "";
      let isExistingUser = false;
      let existingUserData = null;
      try {
        const existingUser = await admin.auth().getUserByEmail(emailLower);
        uid = existingUser.uid;
        console.log(`User already exists in Auth: ${uid}`);
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
            if (existingUserData?.schoolId && existingUserData.schoolId !== schoolId && req.user.role !== "superadmin") {
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
            updateParams.password = crypto.randomBytes(16).toString("hex") + "SecureP1!";
            console.log(`Setting dynamic random password for existing Google user: ${uid}`);
          }
        }
        if (displayName) updateParams.displayName = displayName;
        if (Object.keys(updateParams).length > 1 || updateParams.emailVerified) {
          await admin.auth().updateUser(uid, updateParams);
          console.log(`Updated existing Auth user: ${uid}, verified: true, hasPasswordUpd: ${!!updateParams.password}`);
        }
      } catch (authError) {
        if (authError.code === "auth/user-not-found") {
          const generatedSecurePass = crypto.randomBytes(16).toString("hex") + "SecureP1!";
          const userRecord = await admin.auth().createUser({
            email: emailLower,
            password: password || generatedSecurePass,
            // Ensure a password is set securely
            displayName,
            emailVerified: true
          });
          uid = userRecord.uid;
          console.log(`Created new Auth user: ${uid}, email: ${emailLower}`);
        } else {
          throw authError;
        }
      }
      if (role === "student" && schoolId) {
        let shouldIncrement = true;
        if (isExistingUser && existingUserData?.schoolId === schoolId && existingUserData?.role === "student") {
          shouldIncrement = false;
        }
        await db.runTransaction(async (transaction) => {
          const schoolRef = db.collection("schools").doc(schoolId);
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
            role,
            schoolId,
            ...safeAdditionalData,
            createdAt: isExistingUser ? existingUserData.createdAt : admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          transaction.set(db.collection("students").doc(uid), {
            id: uid,
            email: emailLower,
            name: displayName,
            schoolId,
            ...safeAdditionalData,
            createdAt: isExistingUser ? existingUserData.createdAt : admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          if (shouldIncrement) {
            transaction.update(schoolRef, {
              studentCount: admin.firestore.FieldValue.increment(1)
            });
          }
        });
        await syncUserClaims(uid, role, schoolId, additionalData?.permissions || null);
      } else {
        await syncUserClaims(uid, role, schoolId, additionalData?.permissions || null);
        await db.collection("users").doc(uid).set({
          uid,
          email: emailLower,
          name: displayName,
          role,
          schoolId,
          ...safeAdditionalData,
          createdAt: isExistingUser ? existingUserData.createdAt : admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      await logAudit(req, "CREATE_USER", { after: { email: emailLower, role, schoolId } });
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
      const allowedAdminRoles = ["superadmin", "admin", "staff", "assistant"];
      if (!allowedAdminRoles.includes(req.user.role)) {
        return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0642\u064A\u0627\u0645 \u0628\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A" });
      }
      const db = getDb();
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      const userData = userDoc.data() || {};
      const { role, schoolId } = userData;
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
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "UID required" });
    try {
      const allowedAdminRoles = ["superadmin", "admin", "staff", "assistant"];
      if (!allowedAdminRoles.includes(req.user.role)) {
        return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062D\u0630\u0641 \u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646" });
      }
      const db = getDb();
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "USER_NOT_FOUND", message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      const beforeData = userDoc.data() || {};
      const targetSchoolId = beforeData.schoolId;
      if (req.user.role !== "superadmin") {
        if (!targetSchoolId || targetSchoolId !== req.user.schoolId) {
          return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062D\u0630\u0641 \u0645\u0633\u062A\u062E\u062F\u0645\u0649 \u0627\u0644\u0645\u062F\u0627\u0631\u0633 \u0627\u0644\u0623\u062E\u0631\u0649" });
        }
      }
      try {
        await admin.auth().deleteUser(uid);
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
            parentIds: admin.firestore.FieldValue.arrayRemove(uid)
          });
        });
        await batch.commit();
      }
      await logAudit(req, "DELETE_USER", { before: beforeData, metadata: { targetUid: uid } });
      res.json({
        success: true,
        message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D",
        data: { uid }
      });
    } catch (error) {
      console.error("Delete User Error:", error);
      res.status(500).json({
        success: false,
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
  app.post(
    "/api/admin/schools/:schoolId/permanent-delete",
    verifyAdmin,
    async (req, res) => {
      const { schoolId } = req.params;
      const { confirmName } = req.body || {};
      if (!schoolId) {
        return res.status(400).json({ error: "School ID required" });
      }
      try {
        if (req.user.role !== "superadmin") {
          return res.status(403).json({
            error: "FORBIDDEN",
            message:
              "غير مصرح لك بحذف المدرسة نهائياً. هذا الإجراء مخصص للSuperAdmin فقط",
          });
        }
        const summary = await runSchoolPermanentDelete({
          db: getDb(),
          authAdmin: admin.auth(),
          schoolId,
          confirmName: String(confirmName || ""),
        });
        await logAudit(req, "PERMANENT_DELETE_SCHOOL", {
          metadata: { targetSchoolId: schoolId, summary },
        });
        res.json({ success: true, summary });
      } catch (error) {
        console.error("Permanent Delete School Error:", error);
        res.status(error.status || 500).json({
          error: error.message || "Internal Server Error",
        });
      }
    },
  );
  app.post("/api/admin/delete-student", verifyAdmin, async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Student ID required" });
    try {
      const allowedAdminRoles = ["superadmin", "admin", "staff", "assistant"];
      if (!allowedAdminRoles.includes(req.user.role)) {
        return res.status(403).json({ error: "FORBIDDEN", message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062D\u0630\u0641 \u0627\u0644\u0637\u0644\u0627\u0628" });
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
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else if (filePath.match(/\.(js|css|woff2?|ico|png|jpe?g|gif|svg)$/)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    try {
      const db = getDb();
      const bootTime = admin.firestore.Timestamp.now();
      console.log("[FCM RUNTIME] Active notification-to-push FCM gateway initialized. Listening for school events...");
      db.collection("notifications").where("createdAt", ">=", bootTime).onSnapshot((snapshot) => {
        if (!snapshot) return;
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const notif = change.doc.data();
            const userId = notif.userId;
            const title = notif.title || "\u0625\u0634\u0639\u0627\u0631 \u062C\u062F\u064A\u062F";
            const message = notif.message || notif.content || "";
            const type = notif.type || "system";
            if (!userId) return;
            try {
              let userTokens = [];
              if (userId === "super_admin") {
                const superAdminsSnap = await db.collection("users").where("role", "==", "superadmin").get();
                superAdminsSnap.docs.forEach((doc) => {
                  const tokens = doc.data().fcmTokens;
                  if (Array.isArray(tokens)) {
                    userTokens.push(...tokens);
                  }
                });
              } else {
                const userDoc = await db.collection("users").doc(userId).get();
                if (userDoc.exists) {
                  const tokens = userDoc.data()?.fcmTokens;
                  if (Array.isArray(tokens)) {
                    userTokens.push(...tokens);
                  }
                }
              }
              userTokens = Array.from(new Set(userTokens.filter((t) => typeof t === "string" && t.trim().length > 0)));
              if (userTokens.length > 0) {
                console.log(`[FCM PUSH] Event "${title}" matched for user "${userId}". Dispatching to ${userTokens.length} active devices...`);
                const messages = userTokens.map((token) => ({
                  token,
                  notification: {
                    title: String(title),
                    body: String(message)
                  },
                  data: {
                    type: String(type),
                    schoolId: String(notif.schoolId || ""),
                    userId: String(userId)
                  },
                  android: {
                    priority: "high",
                    notification: {
                      sound: "default"
                    }
                  },
                  apns: {
                    payload: {
                      aps: {
                        sound: "default",
                        badge: 1
                      }
                    }
                  }
                }));
                const response = await admin.messaging().sendEach(messages);
                console.log(`[FCM SUCCESS] Delivered push successfully. Succeeded: ${response.successCount}, Failed: ${response.failureCount}`);
              }
            } catch (fcmErr) {
              console.error("[FCM TRANSMIT ERROR] Failed to dispatch Firebase cloud messages:", fcmErr.message);
            }
          }
        });
      }, (err) => {
        console.error("[FCM LISTENER ERROR] Active Firestore listener caught exception:", err.message);
      });
    } catch (e) {
      console.error("[FCM SYSTEM FAILED] Could not initialize Firebase messaging gateway:", e.message);
    }
    const isProductionEnv = process.env.NODE_ENV === "production";
    const isDevUrl = process.env.APP_URL && (process.env.APP_URL.includes("-dev-") || process.env.APP_URL.includes("localhost") || process.env.APP_URL.includes("127.0.0.1"));
    if (process.env.APP_URL) {
      try {
        const db = getDb();
        const appUrlClean = process.env.APP_URL.replace(/\/$/, "");
        if (isProductionEnv && !isDevUrl) {
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
