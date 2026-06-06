import express from 'express';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import dotEnv from 'dotenv';
import fs from 'fs';
import crypto from 'crypto';

dotEnv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = { projectId: '' };
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
}

const sanitizeEnv = (val: string | undefined) => {
  if (!val) return val;
  let sanitized = val.trim();
  
  // Remove wrapping quotes recursively (handles cases like '""value""')
  // We use a regex to strip all leading/trailing single and double quotes
  sanitized = sanitized.replace(/^["']+|["']+$/g, '').trim();
  
  // Specifically for private keys, replace literal \n with actual newlines
  if (sanitized.includes('\\n')) {
    sanitized = sanitized.replace(/\\n/g, '\n');
  }

  // Ensure private key has actual newlines if it's a multi-line PEM
  if (sanitized.startsWith('-----BEGIN') && !sanitized.includes('\n')) {
     // This handles cases where newlines might have been lost but it's still a PEM
     // though \n replacement above usually handles this for env vars.
  }

  return sanitized;
};

const serviceAccount = {
  projectId: sanitizeEnv(process.env.FIREBASE_PROJECT_ID) || firebaseConfig.projectId,
  clientEmail: sanitizeEnv(process.env.FIREBASE_CLIENT_EMAIL),
  privateKey: sanitizeEnv(process.env.FIREBASE_PRIVATE_KEY),
};

if (serviceAccount.clientEmail && serviceAccount.privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
      storageBucket: firebaseConfig.storageBucket, // Added
    });
    console.log('Firebase Admin initialized with service account.');
  } catch (e: any) {
    console.error('Firebase Admin Initialization Error');
  }
} else {
  // Try default initialization (works if running on GCP with permissions)
  try {
    admin.initializeApp({
      storageBucket: firebaseConfig.storageBucket, // Added
    });
    console.log('Firebase Admin initialized with defaults.');
  } catch (e) {
    console.warn('Firebase Admin failed to initialize.');
  }
}

// Get Firestore instance with database ID if available
const getDb = () => {
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  if (admin.apps.length === 0) {
    return getFirestore();
  }
  return getFirestore(admin.app(), dbId || '(default)');
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Robust CORS Middleware supporting local Capacitor webviews (Android/iOS) and production domains
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'https://schoolixiq.com',
      'https://app.schoolixiq.com',
      'https://schoolixiq.iq',
      'https://app.schoolixiq.iq'
    ];

    if (process.env.APP_URL) {
      allowedOrigins.push(process.env.APP_URL.replace(/\/$/, '').toLowerCase());
    }

    const allowedPatterns = [
      /\.run\.app$/, // Matches Cloud Run dev / preview URLs
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^capacitor:\/\/localhost$/,
      /^https?:\/\/.*-99877674137\.europe-west2\.run\.app$/ // Matches current / future previews environment
    ];

    let isAllowed = false;
    if (!origin) {
      isAllowed = true;
    } else {
      const lowerOrigin = origin.toLowerCase().trim();
      if (allowedOrigins.map(o => o.toLowerCase().trim()).includes(lowerOrigin)) {
        isAllowed = true;
      } else {
        isAllowed = allowedPatterns.some(pattern => pattern.test(lowerOrigin));
      }
    }

    if (origin && isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (origin) {
      console.warn(`Blocked CORS request from origin: ${origin}`);
      return res.status(403).json({ error: 'CORS_BLOCKED', message: 'غير مسموح بالوصول من هذا المصدر للواجهة البرمجية' });
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Authorization, x-requested-with, accept, origin');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Compress all responses (JS, CSS, HTML, API/JSON payloads)
  app.use(compression());

  app.use(express.json({ limit: '10mb' }));

  // Helper to sanitize objects for Firestore (removes/converts undefined values)
  const sanitizeForFirestore = (val: any): any => {
    if (val === undefined) return null;
    if (val === null) return null;

    // Bypass Firestore special objects, Date objects, and objects that can convert to Date
    if (typeof val === 'object') {
      if (val instanceof Date) {
        return val;
      }
      if (val instanceof admin.firestore.FieldValue || 
          val instanceof admin.firestore.Timestamp || 
          val instanceof admin.firestore.GeoPoint || 
          val instanceof admin.firestore.DocumentReference) {
        return val;
      }
      if (val.constructor && [
        'FieldValue', 'Timestamp', 'GeoPoint', 'DocumentReference', 'FieldValueInside', 'TimestampInside', 'Date'
      ].includes(val.constructor.name)) {
        return val;
      }
      if (typeof val.toDate === 'function') {
        return val;
      }
    }

    if (Array.isArray(val)) return val.map(sanitizeForFirestore);
    if (typeof val === 'object') {
      const cleaned: any = {};
      for (const key of Object.keys(val)) {
        const value = val[key];
        if (value !== undefined) {
          cleaned[key] = sanitizeForFirestore(value);
        }
      }
      return cleaned;
    }
    return val;
  };

  // Middleware to log actions (Audit Logs) with IP and User Agent
  const logAudit = async (req: any, action: string, details: { before?: any, after?: any, metadata?: any }) => {
    try {
      const db = getDb();
      const user = req.user || {};
      const sanitizedDetails = details ? sanitizeForFirestore(details) : {};
      await db.collection('audit_logs').add({
        action,
        performedBy: user.email || 'system',
        uid: user.uid || 'system',
        schoolId: user.schoolId || 'system',
        ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        details: sanitizedDetails,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Audit Log Error:', error);
    }
  };

  // Configuration for Bootstrap Admins (Loaded from Env)
  const getBootstrapAdmins = () => {
    const admins = process.env.BOOTSTRAP_ADMIN_EMAILS || "hamzakazem1999@gmail.com";
    return admins.toLowerCase().split(",").map(e => e.trim());
  };

  // Helper to set custom claims with security versioning (sv)
  const syncUserClaims = async (uid: string, role: string, schoolId?: string, permissions?: any) => {
    try {
      const securityVersion = 4; 
      const claims: any = { 
        role, 
        schoolId: schoolId || '',
        sv: securityVersion,
        p: permissions || null // Optional permissions snapshot
      };
      
      // Prevent claims size overflow (max 1000 bytes limit in Firebase Auth)
      const claimsStr = JSON.stringify(claims);
      if (Buffer.byteLength(claimsStr, 'utf8') > 900) {
        console.warn(`[SECURITY] Custom claims size (${Buffer.byteLength(claimsStr, 'utf8')} bytes) exceeds limit for UID: ${uid}. Stripping nested permissions 'p' to avoid claims exception.`);
        claims.p = null;
      }

      await admin.auth().setCustomUserClaims(uid, claims);
      // Removed revokeRefreshTokens to prevent forcefully logging out active sessions when claims simply need syncing
      console.log(`Claims synced for user ${uid}: role=${role}, sv=${securityVersion}`);
    } catch (error) {
      console.error(`Error setting claims for user ${uid}:`, error);
    }
  };

  // Middleware to verify Admin using Claims & Multi-tenancy
  const verifyAdmin = async (req: any, res: any, next: any) => {
    let authHeader = req.headers.authorization;
    if (!authHeader && req.headers['x-authorization']) {
      authHeader = req.headers['x-authorization'];
    }
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const email = decodedToken.email?.toLowerCase();
      
      // 1. Check Bootstrap Admins (Security Hardening: must be verified)
      let isBootstrapAdmin = false;
      if (getBootstrapAdmins().includes(email) && decodedToken.email_verified === true) {
        const db = getDb();
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        const usersCount = (await db.collection('users').limit(1).get()).size;
        
        // Only allow bootstrapping if database has no users, or if user is explicitly registered as superadmin
        if (usersCount === 0 || (userDoc.exists && userDoc.data()?.role === 'superadmin')) {
          isBootstrapAdmin = true;
          if (decodedToken.role !== 'superadmin') {
            await syncUserClaims(decodedToken.uid, 'superadmin');
          }
        }
      }

      // 2. Roles & Permissions Authorization
      let role = decodedToken.role;
      let schoolId = decodedToken.schoolId;

      // 3. Fallback to Firestore if claims are missing
      if (!role || decodedToken.p === undefined) {
        const db = getDb();
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          role = userData?.role || 'staff';
          schoolId = userData?.schoolId || '';
          
          let permissions = userData?.permissions || null;
          
          // If it's a school staff/admin and no granular permissions, fetch from package
          if (schoolId && (!permissions || typeof permissions !== 'object')) {
            const schoolDoc = await db.collection('schools').doc(schoolId).get();
            if (schoolDoc.exists) {
              const planId = schoolDoc.data()?.planId || 'basic';
              const packageDoc = await db.collection('packages').doc(planId).get();
              if (packageDoc.exists) {
                permissions = packageDoc.data()?.permissions || null;
              }
            }
          }
          
          await syncUserClaims(decodedToken.uid, role, schoolId, permissions);
        } else if (!isBootstrapAdmin) {
          return res.status(403).json({ error: 'Forbidden: User profile not found' });
        }
      }

      // STRICT ROLE ENFORCEMENT
      const allowedRoles = ['admin', 'superadmin', 'staff', 'assistant'];
      const hasAdminRights = allowedRoles.includes(role);

      if (!hasAdminRights) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }

      // 4. Verification Check bypassed for school operations in real environments (email_verified not mandatory)

      // 5. Subscription Expiry Check
      if (role !== 'superadmin' && schoolId) {
        const db = getDb();
        const schoolDoc = await db.collection('schools').doc(schoolId).get();
        if (schoolDoc.exists) {
          const expirationData = schoolDoc.data()?.subscriptionExpiresAt;
          if (expirationData) {
            let expiryDate: Date;
            if (typeof expirationData.toDate === 'function') {
              expiryDate = expirationData.toDate();
            } else {
              expiryDate = new Date(expirationData);
            }
            if (expiryDate < new Date()) {
              return res.status(402).json({ error: 'SUBSCRIPTION_EXPIRED', message: 'انتهت صلاحية اشتراك المدرسة' });
            }
          }
        }
      }

      req.user = { ...decodedToken, role, schoolId };
      next();
    } catch (error: any) {
      console.error('VerifyAdmin Error:', error.message);
      res.status(401).json({ error: `Authentication failed: ${error.message}` });
    }
  };

  // Helper to extract and verify JWT for general user actions (even non-admins, e.g. teachers/parents for homework/expenses upload)
  const verifyToken = async (req: any, res: any, next: any) => {
    let authHeader = req.headers.authorization;
    if (!authHeader && req.headers['x-authorization']) {
      authHeader = req.headers['x-authorization'];
    }
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'يرجى تسجيل الدخول أولاً للقيام بهذه العملية' });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (e: any) {
      return res.status(401).json({ error: 'AuthenticationFailed', message: `فشل التحقق من الهوية: ${e.message}` });
    }
  };

  // Upload API using Firebase Admin Storage (Securely Authenticated)
  app.post('/api/upload', verifyToken, express.json({ limit: '20mb' }), async (req: any, res: any) => {
    try {
      const { path: storagePath, base64 } = req.body;
      if (!storagePath || !base64) return res.status(400).json({ error: 'Missing path or base64' });

      // 1. File Size Verification (Max 10MB to avoid oversized uploads)
      const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB
      
      if (buffer.length > maxSizeBytes) {
        return res.status(400).json({
          error: 'FILE_TOO_LARGE',
          message: 'حجم الملف كبير جداً. الحد الأقصى المسموح به هو 10 ميجابايت.'
        });
      }

      // 2. MIME Type / File Extension Validation
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.mp3', '.m4a', '.wav', '.json', '.mobileconfig'];
      const ext = path.extname(storagePath).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        return res.status(400).json({
          error: 'INVALID_FILE_TYPE',
          message: 'نوع الملف غير مدعوم على هذه المنصة لأسباب أمنية.'
        });
      }

      // 3. MIME type detection
      let contentType = 'application/octet-stream';
      if (base64.startsWith('data:')) {
        const mimeMatch = base64.match(/^data:([^;]+);base64,/);
        if (mimeMatch) {
          contentType = mimeMatch[1];
        }
      } else {
        const mimeTypes: any = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp',
          '.pdf': 'application/pdf',
          '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.xls': 'application/vnd.ms-excel',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '.txt': 'text/plain',
          '.mp3': 'audio/mpeg',
          '.m4a': 'audio/mp4',
          '.wav': 'audio/wav',
          '.json': 'application/json'
        };
        contentType = mimeTypes[ext] || 'application/octet-stream';
      }

      // Prevent script or executable execution via upload bypass
      const disallowedMimeTypes = ['text/html', 'text/javascript', 'application/javascript', 'application/x-msdownload', 'application/x-sh', 'application/bat'];
      if (disallowedMimeTypes.includes(contentType.toLowerCase())) {
        return res.status(400).json({
          error: 'FORBIDDEN_FILE_TYPE',
          message: 'غير مسموح برفع ملفات برمجية أو صفحات ويب نهائياً.'
        });
      }

      try {
        const bucket = getStorage().bucket();
        const file = bucket.file(storagePath);
        
        // Use secure cryptographically generated dynamic UUID tokens
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
      } catch (uploadError: any) {
        // If the bucket doesn't exist or isn't configured, fallback to storing the base64 string directly
        if (uploadError.message?.includes('bucket does not exist') || uploadError.message?.toLowerCase().includes('not found') || uploadError.code === 404) {
          console.warn('Storage bucket not found, falling back to base64 Data URL...');
          return res.json({ url: base64 });
        }
        throw uploadError;
      }
    } catch (error: any) {
      console.error('Upload API Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // iOS Configuration Profile Download API
  app.get('/api/download/schoolixiq.mobileconfig', (req, res) => {
    const host = req.get('host') || 'schoolixiq.com';
    const protocol = req.headers['x-forwarded-proto'] === 'https' || req.secure ? 'https' : 'http';
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
      <string>منصة SchoolixiQ التعليمية</string>
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
  <string>منصة SchoolixiQ</string>
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

    res.setHeader('Content-Type', 'application/x-apple-aspen-config');
    res.setHeader('Content-Disposition', 'inline; filename="schoolixiq.mobileconfig"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(profileXML);
  });

  // Admin APIs
  app.post('/api/admin/create-user', verifyAdmin, async (req: any, res: any) => {
    try {
      const { email, password, displayName, role, schoolId, additionalData } = req.body || {};
      if (!email) {
        return res.status(400).json({ error: 'EMAIL_REQUIRED', message: 'البريد الإلكتروني مطلوب' });
      }

      // 1. Enforce administrative access check (superadmin, admin, staff, assistant)
      const allowedAdminRoles = ['superadmin', 'admin', 'staff', 'assistant'];
      if (!allowedAdminRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'غير مصرح لك بالقيام بهذه العملية الإدارية' });
      }

      // 2. Enforce school boundary verification for multi-tenancy
      if (req.user.role !== 'superadmin') {
        if (!schoolId || schoolId !== req.user.schoolId) {
          return res.status(403).json({ error: 'FORBIDDEN', message: 'غير مسموح لك بإنشاء مستخدمين لمدرسة أخرى' });
        }
      }

      const emailLower = email.toLowerCase().trim();
      console.log(`Creating user: ${emailLower}, role: ${role}`);
      
      const db = getDb();
      let uid = '';
      let isExistingUser = false;
      let existingUserData: any = null;

      // Check if user already exists in Firebase Auth
      try {
        const existingUser = await admin.auth().getUserByEmail(emailLower);
        uid = existingUser.uid;
        console.log(`User already exists in Auth: ${uid}`);
        
        // Check if user exists in our Firestore 'users' collection
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          isExistingUser = true;
          existingUserData = userDoc.data();
          
          if (role === 'parent') {
            if (existingUserData?.role && existingUserData.role !== 'parent') {
              return res.status(400).json({
                error: 'ROLE_CONFLICT',
                message: 'هذا البريد الإلكتروني مسجل بحساب موظف أو معلم. يرجى استخدام بريد مختلف لولي الأمر.'
              });
            }
          } else {
            // For non-parent roles, enforce school exclusivity
            if (existingUserData?.schoolId && existingUserData.schoolId !== schoolId && req.user.role !== 'superadmin') {
              return res.status(400).json({ 
                error: 'USER_ALREADY_IN_ANOTHER_SCHOOL', 
                message: 'هذا البريد الإلكتروني مسجل بالفعل لمدرسة أخرى' 
              });
            }
          }
        }
        
        // Update user properties if needed
        const updateParams: any = {
          emailVerified: true // Set to true since admin is creating/linking
        };
        
        // Use provided password, or if none provided and they don't have one, set dynamic random secure one
        if (password) {
          updateParams.password = password;
        } else {
          // Check if they have a password
          const hasPassword = existingUser.providerData.some(p => p.providerId === 'password');
          if (!hasPassword) {
            updateParams.password = crypto.randomBytes(16).toString('hex') + 'SecureP1!';
            console.log(`Setting dynamic random password for existing Google user: ${uid}`);
          }
        }
        
        if (displayName) updateParams.displayName = displayName;
        
        if (Object.keys(updateParams).length > 1 || updateParams.emailVerified) {
          await admin.auth().updateUser(uid, updateParams);
          console.log(`Updated existing Auth user: ${uid}, verified: true, hasPasswordUpd: ${!!updateParams.password}`);
        }

      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          // Normal case: create new user
          const generatedSecurePass = crypto.randomBytes(16).toString('hex') + 'SecureP1!';
          const userRecord = await admin.auth().createUser({
            email: emailLower,
            password: password || generatedSecurePass, // Ensure a password is set securely
            displayName,
            emailVerified: true,
          });
          uid = userRecord.uid;
          console.log(`Created new Auth user: ${uid}, email: ${emailLower}`);
        } else {
          throw authError; // Rethrow other Auth errors
        }
      }

      if (role === 'student' && schoolId) {
        let shouldIncrement = true;
        if (isExistingUser && existingUserData?.schoolId === schoolId && existingUserData?.role === 'student') {
          shouldIncrement = false;
        }

        await db.runTransaction(async (transaction) => {
          const schoolRef = db.collection('schools').doc(schoolId);
          const schoolSnap = await transaction.get(schoolRef);
          
          if (!schoolSnap.exists) throw new Error('المدرسة غير موجودة');
          const schoolData = schoolSnap.data()!;
          const currentCount = schoolData.studentCount || 0;
          
          const planId = schoolData.planId || 'basic';
          const planDoc = await db.collection('packages').doc(planId).get();
          const maxStudents = planDoc.exists ? (planDoc.data()?.maxStudents || 500) : 500;
          
          if (shouldIncrement && currentCount >= maxStudents) {
            throw new Error(`وصلت للحد الأقصى المسموح به للطلاب (${maxStudents})`);
          }

          transaction.set(db.collection('users').doc(uid), {
            uid,
            email: emailLower,
            name: displayName,
            role,
            schoolId,
            ...additionalData,
            createdAt: isExistingUser ? existingUserData.createdAt : admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          
          // Data link bug fix: also sync to students collection to maintain reference integrity
          transaction.set(db.collection('students').doc(uid), {
            id: uid,
            email: emailLower,
            name: displayName,
            schoolId,
            ...additionalData,
            createdAt: isExistingUser ? existingUserData.createdAt : admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });

          if (shouldIncrement) {
            transaction.update(schoolRef, {
              studentCount: admin.firestore.FieldValue.increment(1)
            });
          }
        });

        // Sync custom claims safely OUTSIDE the database transaction
        await syncUserClaims(uid, role, schoolId, additionalData?.permissions || null);
      } else {
        await syncUserClaims(uid, role, schoolId, additionalData?.permissions || null);

        await db.collection('users').doc(uid).set({
          uid,
          email: emailLower,
          name: displayName,
          role,
          schoolId,
          ...additionalData,
          createdAt: isExistingUser ? existingUserData.createdAt : admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      await logAudit(req, 'CREATE_USER', { after: { email: emailLower, role, schoolId } });
      res.json({
        success: true,
        message: 'تم إنشاء المستخدم بنجاح',
        data: { uid }
      });
    } catch (error: any) {
      console.error('Create User Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error',
        message: error.message || 'حدث خطأ أثناء إنشاء المستخدم'
      });
    }
  });

  // API to manually sync claims (useful for migration or fixing issues)
  app.post('/api/admin/sync-claims', verifyAdmin, async (req: any, res: any) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'UID required' });
    
    try {
      // 1. Enforce administrative access
      const allowedAdminRoles = ['superadmin', 'admin', 'staff', 'assistant'];
      if (!allowedAdminRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'غير مصرح لك بالقيام بمزامنة الصلاحيات' });
      }

      const db = getDb();
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      
      const userData = userDoc.data() || {};
      const { role, schoolId } = userData;

      // 2. Enforce school boundary verification for multi-tenancy
      if (req.user.role !== 'superadmin') {
        if (!schoolId || schoolId !== req.user.schoolId) {
          return res.status(403).json({ error: 'FORBIDDEN', message: 'غير مسموح لك بمزامنة صلاحيات أعضاء المدارس الأخرى' });
        }
      }
      
      // Get permissions from user doc or fallback to school's plan
      let permissions = userData.permissions || null;
      
      if (!permissions && schoolId) {
        const schoolDoc = await db.collection('schools').doc(schoolId).get();
        const planId = schoolDoc.data()?.planId;
        if (planId) {
          const planDoc = await db.collection('packages').doc(planId).get();
          permissions = planDoc.data()?.permissions;
        }
      }

      await syncUserClaims(uid, role, schoolId, permissions);
      
      await logAudit(req, 'SYNC_CLAIMS', { metadata: { targetUid: uid, role, schoolId, permissions } });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- PLAN MANAGEMENT (SUPERADMIN ONLY) ---
  app.post('/api/admin/plans', verifyAdmin, async (req: any, res: any) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'SuperAdmin access required' });
    try {
      const db = getDb();
      const plan = req.body;
      const docRef = await db.collection('packages').add({
        ...plan,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await logAudit(req, 'CREATE_PLAN', { after: plan });
      res.json({ id: docRef.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/admin/plans/:id', verifyAdmin, async (req: any, res: any) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'SuperAdmin access required' });
    try {
      const db = getDb();
      const { id } = req.params;
      const beforeDoc = await db.collection('packages').doc(id).get();
      await db.collection('packages').doc(id).update({
        ...req.body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await logAudit(req, 'UPDATE_PLAN', { before: beforeDoc.data() || null, after: req.body });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/plans/:id', verifyAdmin, async (req: any, res: any) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'SuperAdmin access required' });
    try {
      const db = getDb();
      const { id } = req.params;
      const beforeDoc = await db.collection('packages').doc(id).get();
      await db.collection('packages').doc(id).delete();
      await logAudit(req, 'DELETE_PLAN', { before: beforeDoc.data() || null });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/delete-user', verifyAdmin, async (req: any, res: any) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'UID required' });
    
    try {
      // 1. Enforce administrative access check (allowed roles: superadmin, admin, staff, assistant)
      const allowedAdminRoles = ['superadmin', 'admin', 'staff', 'assistant'];
      if (!allowedAdminRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'غير مصرح لك بحذف حسابات المستخدمين' });
      }

      const db = getDb();
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'المستخدم غير موجود' });
      }

      const beforeData = userDoc.data() || {};
      const targetSchoolId = beforeData.schoolId;

      // 2. Enforce strict multi-tenancy check
      if (req.user.role !== 'superadmin') {
        if (!targetSchoolId || targetSchoolId !== req.user.schoolId) {
          return res.status(403).json({ error: 'FORBIDDEN', message: 'غير مصرح لك بحذف مستخدمى المدارس الأخرى' });
        }
      }

      // 3. Delete from Auth
      try {
        await admin.auth().deleteUser(uid);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          console.log(`User ${uid} already removed from Auth.`);
        } else {
          console.warn(`Failed to delete user ${uid} from Auth:`, authError.message);
        }
      }
      
      // 2. Delete from Firestore users
      await db.collection('users').doc(uid).delete();

      // 3. Remove as parent from students if applicable
      const studentsSnap = await db.collection('students')
        .where('parentIds', 'array-contains', uid)
        .get();
      
      if (!studentsSnap.empty) {
        const batch = db.batch();
        studentsSnap.docs.forEach(doc => {
          batch.update(doc.ref, {
            parentIds: admin.firestore.FieldValue.arrayRemove(uid)
          });
        });
        await batch.commit();
      }
      
      // 4. Log the action with snapshot
      await logAudit(req, 'DELETE_USER', { before: beforeData, metadata: { targetUid: uid } });

      res.json({
        success: true,
        message: 'تم حذف الحساب بنجاح',
        data: { uid }
      });
    } catch (error: any) {
      console.error('Delete User Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error',
        message: error.message || 'حدث خطأ أثناء حذف الحساب'
      });
    }
  });

  app.post('/api/admin/delete-school', verifyAdmin, async (req: any, res: any) => {
    const { schoolId } = req.body;
    if (!schoolId) return res.status(400).json({ error: 'School ID required' });
    
    try {
      // 1. Restrict delete-school strictly to superadmin
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'غير مصرح لك بحذف المدرسة. هذا الإجراء مخصص للمطور/SuperAdmin فقط' });
      }

      const db = getDb();
      
      // 1. Delete all users associated with this school
      const usersQuery = await db.collection('users').where('schoolId', '==', schoolId).get();
      const userDeletions = usersQuery.docs.map(async (uDoc) => {
        try {
          await admin.auth().deleteUser(uDoc.id);
        } catch (e) {
          // ignore auth not found
        }
        await uDoc.ref.delete();
      });
      await Promise.all(userDeletions);

      // 2. Delete all students
      const studentsQuery = await db.collection('students').where('schoolId', '==', schoolId).get();
      const studentDeletions = studentsQuery.docs.map(sDoc => sDoc.ref.delete());
      await Promise.all(studentDeletions);

      // 3. Delete other related collections in parallel and chunked batches
      const collectionsToCleanup = [
        "staff", "homework", "exams", "fees", "expenses", "logs", 
        "notifications", "attendance", "announcements", "payroll", 
        "inventory", "market", "orders", "payments", "behavior_reports", 
        "behavior", "grades", "installments", "teacher_reports", "classes", "subscriptionRequests"
      ];
      
      const deleteCollectionForSchool = async (colName: string) => {
        try {
          const snap = await db.collection(colName).where('schoolId', '==', schoolId).get();
          if (!snap.empty) {
            // Firestore batches have a limit of 500 operations
            const docs = snap.docs;
            const batchSize = 400;
            for (let i = 0; i < docs.length; i += batchSize) {
              const chunk = docs.slice(i, i + batchSize);
              const batch = db.batch();
              chunk.forEach(doc => batch.delete(doc.ref));
              await batch.commit();
            }
          }
        } catch (e) {
          console.error(`Cleanup failed for ${colName}:`, e);
        }
      };

      await Promise.all(collectionsToCleanup.map(colName => deleteCollectionForSchool(colName)));

      // 4. Finally delete school
      await db.collection('schools').doc(schoolId).delete();
      await logAudit(req, 'DELETE_SCHOOL', { metadata: { targetSchoolId: schoolId } });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete School Error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  app.post('/api/admin/delete-student', verifyAdmin, async (req: any, res: any) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Student ID required' });
    
    try {
      // 1. Enforce administrative access check (allowed roles: superadmin, admin, staff, assistant)
      const allowedAdminRoles = ['superadmin', 'admin', 'staff', 'assistant'];
      if (!allowedAdminRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'غير مصرح لك بحذف الطلاب' });
      }

      const db = getDb();
      const studentDoc = await db.collection('students').doc(id).get();
      const beforeData = studentDoc.exists ? studentDoc.data() : null;
      const schoolId = beforeData?.schoolId;

      // 2. Enforce school boundary verification for multi-tenancy
      if (req.user.role !== 'superadmin') {
        if (!schoolId || schoolId !== req.user.schoolId) {
          return res.status(403).json({ error: 'FORBIDDEN', message: 'غير مسموح لك بحذف طلاب مدرسة أخرى' });
        }
      }

      await db.runTransaction(async (transaction) => {
        // 1. Delete from Firestore collections
        transaction.delete(db.collection('students').doc(id));
        transaction.delete(db.collection('users').doc(id));

        // 2. Decrement school student counter
        if (schoolId) {
          transaction.update(db.collection('schools').doc(schoolId), {
            studentCount: admin.firestore.FieldValue.increment(-1)
          });
        }
      });

      // 3. Delete from Auth (if exists) - outside transaction
      try {
        await admin.auth().deleteUser(id);
      } catch (authError) {
        // Expected if students don't have accounts
      }

      // 4. Log audit
      await logAudit(req, 'DELETE_STUDENT', { before: beforeData, metadata: { targetId: id } });

      res.json({
        success: true,
        message: 'تم حذف الطالب بنجاح',
        data: { id }
      });
    } catch (error: any) {
      console.error('Delete Student Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error',
        message: error.message || 'حدث خطأ أثناء حذف الطالب'
      });
    }
  });

  app.post('/api/admin/backup', verifyAdmin, async (req: any, res: any) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'SuperAdmin access required' });
    try {
      const db = getDb();
      const collectionsToBackup = ['schools', 'users', 'students', 'classes', 'packages', 'orders', 'payments', 'installments', 'grades', 'attendance_records'];

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', "attachment; filename=schoolixiq_backup_" + new Date().toISOString().split('T')[0] + ".json");
      
      res.write('{\n');
      res.write('  "timestamp": "' + new Date().toISOString() + '",\n');
      res.write('  "collections": {\n');

      for (let i = 0; i < collectionsToBackup.length; i++) {
        const collName = collectionsToBackup[i];
        res.write('    "' + collName + '": [\n');

        let lastDoc: any = null;
        let hasMore = true;
        let isFirstInColl = true;
        
        while (hasMore) {
          let query = db.collection(collName).orderBy(admin.firestore.FieldPath.documentId()).limit(1000);
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
          if (docs.length < 1000) {
            hasMore = false;
          }

          for (const doc of docs) {
            if (!isFirstInColl) {
              res.write(',\n');
            }
            res.write('      ' + JSON.stringify({ id: doc.id, ...doc.data() }));
            isFirstInColl = false;
          }
        }

        res.write('\n    ]');
        if (i < collectionsToBackup.length - 1) {
          res.write(',\n');
        } else {
          res.write('\n');
        }
      }

      res.write('  }\n');
      res.write('}\n');
      res.end();

      await logAudit(req, 'MANUAL_BACKUP', { metadata: { collectionsCount: collectionsToBackup.length } });
    } catch (error: any) {
      console.error('Backup Error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Internal Server Error' });
      }
    }
  });

  // Global API 404 handler - MUST be before Vite middleware
  app.all('/api/*', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.url}`,
      message: 'العنوان غير موجود أو غير معرف في النظام'
    });
  });

  // Global error handler for API routes to prevent HTML error pages being returned
  app.use('/api/*', (err: any, req: any, res: any, next: any) => {
    console.error('Unhandled API Error:', err);
    res.setHeader('Content-Type', 'application/json');
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.name || 'InternalServerError',
      message: err.message || 'حدث خطأ داخلي في الخادم'
    });
  });

  // Vite transformation
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    // Serve Vite hashed assets (/assets/*) with maximum client-side caching (1 year, immutable)
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
      fallthrough: false
    }));

    // Serve other static resources with smart cache controls
    app.use(express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          // Never cache index.html so users always get the latest version immediately
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.match(/\.(js|css|woff2?|ico|png|jpe?g|gif|svg)$/)) {
          // Cache non-asset bundle static files as standard browser optimization
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // START FCM BACKGROUND PUSH DISPATCH LISTENER
    try {
      const db = getDb();
      const bootTime = admin.firestore.Timestamp.now();
      console.log('[FCM RUNTIME] Active notification-to-push FCM gateway initialized. Listening for school events...');
      
      db.collection('notifications')
        .where('createdAt', '>=', bootTime)
        .onSnapshot(snapshot => {
          if (!snapshot) return;
          snapshot.docChanges().forEach(async change => {
            if (change.type === 'added') {
              const notif = change.doc.data();
              const userId = notif.userId;
              const title = notif.title || 'إشعار جديد';
              const message = notif.message || notif.content || '';
              const type = notif.type || 'system';
              
              if (!userId) return;
              
              try {
                let userTokens: string[] = [];
                if (userId === 'super_admin') {
                  // Notify all super admins
                  const superAdminsSnap = await db.collection('users').where('role', '==', 'superadmin').get();
                  superAdminsSnap.docs.forEach(doc => {
                    const tokens = doc.data().fcmTokens;
                    if (Array.isArray(tokens)) {
                      userTokens.push(...tokens);
                    }
                  });
                } else {
                  // Fetch targeted user tokens
                  const userDoc = await db.collection('users').doc(userId).get();
                  if (userDoc.exists) {
                    const tokens = userDoc.data()?.fcmTokens;
                    if (Array.isArray(tokens)) {
                      userTokens.push(...tokens);
                    }
                  }
                }
                
                userTokens = Array.from(new Set(userTokens.filter(t => typeof t === 'string' && t.trim().length > 0)));
                
                if (userTokens.length > 0) {
                  console.log(`[FCM PUSH] Event "${title}" matched for user "${userId}". Dispatching to ${userTokens.length} active devices...`);
                  
                  // Build payloads for each token
                  const messages = userTokens.map(token => ({
                    token,
                    notification: {
                      title: String(title),
                      body: String(message),
                    },
                    data: {
                      type: String(type),
                      schoolId: String(notif.schoolId || ''),
                      userId: String(userId)
                    },
                    android: {
                      priority: 'high' as const,
                      notification: {
                        sound: 'default'
                      }
                    },
                    apns: {
                      payload: {
                        aps: {
                          sound: 'default',
                          badge: 1
                        }
                      }
                    }
                  }));
                  
                  const response = await admin.messaging().sendEach(messages);
                  console.log(`[FCM SUCCESS] Delivered push successfully. Succeeded: ${response.successCount}, Failed: ${response.failureCount}`);
                }
              } catch (fcmErr: any) {
                console.error('[FCM TRANSMIT ERROR] Failed to dispatch Firebase cloud messages:', fcmErr.message);
              }
            }
          });
        }, err => {
          console.error('[FCM LISTENER ERROR] Active Firestore listener caught exception:', err.message);
        });
    } catch (e: any) {
      console.error('[FCM SYSTEM FAILED] Could not initialize Firebase messaging gateway:', e.message);
    }

    // Save APP_URL dynamically to Firestore system config so all clients (including Mobile Apps) have access to the actual server URL
    // CRITICAL: We ONLY save in production, and only if it's not a development/dev environment.
    // This prevents development servers from contaminating the shared database.
    const isProductionEnv = process.env.NODE_ENV === 'production';
    const isDevUrl = process.env.APP_URL && (
      process.env.APP_URL.includes('-dev-') || 
      process.env.APP_URL.includes('localhost') || 
      process.env.APP_URL.includes('127.0.0.1')
    );

    if (process.env.APP_URL) {
      try {
        const db = getDb();
        const appUrlClean = process.env.APP_URL.replace(/\/$/, '');
        if (isProductionEnv && !isDevUrl) {
          await db.collection('system').doc('config').set({
            appUrl: appUrlClean,
            appUrlProd: appUrlClean
          }, { merge: true });
          console.log(`Successfully saved production APP_URL (${appUrlClean}) to system/config.`);
        } else {
          await db.collection('system').doc('config').set({
            appUrlDev: appUrlClean
          }, { merge: true });
          console.log(`Successfully saved development APP_URL (${appUrlClean}) to system/config (appUrlDev).`);
        }
      } catch (err: any) {
        console.error('Failed to save APP_URL to system/config:', err.message);
      }
    }
  });
}

startServer();
