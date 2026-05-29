import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import dotEnv from 'dotenv';
import fs from 'fs';
import nodemailer from 'nodemailer';

dotEnv.config({ override: true });

// Initialize Firebase Admin
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
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
  const dbId = (firebaseConfig as any).firestoreDatabaseId || (firebaseConfig as any).databaseId;
  if (admin.apps.length === 0) {
    throw new Error('Firebase Admin not fully initialized - no default app');
  }
  return getFirestore(admin.app(), dbId || '(default)');
};

async function startServer() {
  const app = express();
  const PORT = 3000; // Hardcoded to 3000 per infrastructure requirements

  app.use(express.json({ limit: '10mb' }));

  // Middleware to log actions (Audit Logs) with IP and User Agent
  const logAudit = async (req: any, action: string, details: { before?: any, after?: any, metadata?: any }) => {
    try {
      const db = getDb();
      const user = req.user || {};
      await db.collection('audit_logs').add({
        action,
        performedBy: user.email || 'system',
        uid: user.uid || 'system',
        schoolId: user.schoolId || 'system',
        ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        details,
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
      await admin.auth().setCustomUserClaims(uid, { 
        role, 
        schoolId: schoolId || '',
        sv: securityVersion,
        p: permissions || null // Optional permissions snapshot
      });
      // Revoke refresh tokens to force new token acquisition
      await admin.auth().revokeRefreshTokens(uid);
      console.log(`Claims synced & tokens revoked for user ${uid}: role=${role}, sv=${securityVersion}`);
    } catch (error) {
      console.error(`Error setting claims for user ${uid}:`, error);
    }
  };

  // Middleware to verify Admin using Claims & Multi-tenancy
  const verifyAdmin = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const email = decodedToken.email?.toLowerCase();
      
      // 1. Check Bootstrap Admins (Robust login for designated accounts)
      const isBootstrapAdmin = getBootstrapAdmins().includes(email);
      
      if (isBootstrapAdmin && decodedToken.role !== 'superadmin') {
        await syncUserClaims(decodedToken.uid, 'superadmin');
      }

      // 2. Roles & Permissions Authorization
      let role = isBootstrapAdmin ? 'superadmin' : decodedToken.role;
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

      // 4. Verification Check (Allow School Admins to proceed for setup)
      if (role !== 'superadmin' && role !== 'admin' && !decodedToken.email_verified) {
        return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED', message: 'يرجى تأكيد البريد الإلكتروني للقيام بهذه العملية' });
      }

      // 5. Subscription Expiry Check
      if (role !== 'superadmin' && schoolId) {
        const db = getDb();
        const schoolDoc = await db.collection('schools').doc(schoolId).get();
        if (schoolDoc.exists) {
          const expirationData = schoolDoc.data()?.subscriptionExpiresAt;
          if (expirationData && new Date(expirationData) < new Date()) {
            return res.status(402).json({ error: 'SUBSCRIPTION_EXPIRED', message: 'انتهت صلاحية اشتراك المدرسة' });
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

  // Upload API using Firebase Admin Storage
  app.post('/api/upload', express.json({ limit: '20mb' }), async (req: any, res: any) => {
    try {
      const { path: storagePath, base64 } = req.body;
      if (!storagePath || !base64) return res.status(400).json({ error: 'Missing path or base64' });

      try {
        const bucket = getStorage().bucket();
        const file = bucket.file(storagePath);
        
        const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        const token = Date.now() + Math.random().toString(36).substring(2);
        
        await file.save(buffer, {
          metadata: {
            contentType: 'image/jpeg',
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

  // Admin APIs
  app.post('/api/admin/create-user', verifyAdmin, async (req: any, res: any) => {
    const { email, password, displayName, role, schoolId, additionalData } = req.body;
    const emailLower = email.toLowerCase().trim();
    console.log(`Creating user: ${emailLower}, role: ${role}`);
    
    try {
      const db = getDb();
      let uid = '';

      // Check if user already exists in Firebase Auth
      try {
        const existingUser = await admin.auth().getUserByEmail(emailLower);
        uid = existingUser.uid;
        console.log(`User already exists in Auth: ${uid}`);
        
        // Check if user exists in our Firestore 'users' collection
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          // If already in another school, block it (unless same school)
          if (userData?.schoolId && userData.schoolId !== schoolId && req.user.role !== 'superadmin') {
            return res.status(400).json({ 
              error: 'USER_ALREADY_IN_ANOTHER_SCHOOL', 
              message: 'هذا البريد الإلكتروني مسجل بالفعل لمدرسة أخرى' 
            });
          }

          // Role conflict check: management cannot be teacher or parent
          const isManagement = ['admin', 'staff', 'assistant', 'superadmin'].includes(userData?.role);
          const requestedIsRestricted = ['teacher', 'parent'].includes(role);
          
          if (isManagement && requestedIsRestricted) {
            return res.status(400).json({ 
              error: 'ROLE_CONFLICT', 
              message: 'هذا الحساب مسجل كإدارة مدرسة ولا يمكن استخدامه كمعلم أو ولي أمر بنفس البريد' 
            });
          }
        }
        
        // Update user properties if needed
        const updateParams: any = {
          emailVerified: true // Set to true since admin is creating/linking
        };
        
        // Use provided password, or if none provided and they don't have one, set default
        if (password) {
          updateParams.password = password;
        } else {
          // Check if they have a password
          const hasPassword = existingUser.providerData.some(p => p.providerId === 'password');
          if (!hasPassword) {
            updateParams.password = 'Parent123!';
            console.log(`Setting default password for existing Google user: ${uid}`);
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
          const userRecord = await admin.auth().createUser({
            email: emailLower,
            password: password || 'Parent123!', // Ensure a password is set
            displayName,
            emailVerified: true,
          });
          uid = userRecord.uid;
          console.log(`Created new Auth user: ${uid}, email: ${emailLower}`);
        } else {
          throw authError; // Rethrow other Auth errors
        }
      }

      // Set custom claims for role-based access in Firestore rules (enables list rules without get() lookups)
      if (uid) {
        await admin.auth().setCustomUserClaims(uid, {
          role: role,
          schoolId: schoolId
        });
        console.log(`Set custom claims for user ${uid}: role=${role}, schoolId=${schoolId}`);
      }

      if (role === 'student' && schoolId) {
        await db.runTransaction(async (transaction) => {
          const schoolRef = db.collection('schools').doc(schoolId);
          const schoolSnap = await transaction.get(schoolRef);
          
          if (!schoolSnap.exists) throw new Error('المدرسة غير موجودة');
          const schoolData = schoolSnap.data()!;
          const currentCount = schoolData.studentCount || 0;
          
          const planId = schoolData.planId || 'basic';
          const planDoc = await db.collection('packages').doc(planId).get();
          const maxStudents = planDoc.exists ? (planDoc.data()?.maxStudents || 500) : 500;
          
          if (currentCount >= maxStudents) {
            throw new Error(`وصلت للحد الأقصى المسموح به للطلاب (${maxStudents})`);
          }

          await syncUserClaims(uid, role, schoolId);

          transaction.set(db.collection('users').doc(uid), {
            uid,
            email: emailLower,
            name: displayName,
            role,
            schoolId,
            ...additionalData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });

          transaction.update(schoolRef, {
            studentCount: admin.firestore.FieldValue.increment(1)
          });
        });
      } else {
        await syncUserClaims(uid, role, schoolId, additionalData?.permissions || null);

        await db.collection('users').doc(uid).set({
          uid,
          email: emailLower,
          name: displayName,
          role,
          schoolId,
          ...additionalData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      await logAudit(req, 'CREATE_USER', { after: { email: emailLower, role, schoolId } });
      res.json({ uid });
    } catch (error: any) {
      console.error('Create User Error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // API to manually sync claims (useful for migration or fixing issues)
  app.post('/api/admin/sync-claims', verifyAdmin, async (req: any, res: any) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'UID required' });
    
    try {
      const db = getDb();
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      
      const userData = userDoc.data() || {};
      const { role, schoolId } = userData;
      
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
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'assistant') {
      return res.status(403).json({ error: 'SuperAdmin access required' });
    }
    // Basic permissions check
    if (req.user.role === 'assistant' && !req.user.permissions?.includes('manage_packages')) {
      return res.status(403).json({ error: 'Missing manage_packages permission' });
    }
    
    try {
      const db = getDb();
      //@ts-ignore
      console.log('API POST /api/admin/plans dbId:', db.databaseId);
      const plan = req.body;
      const docRef = await db.collection('packages').add({
        ...plan,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await logAudit(req, 'CREATE_PLAN', { after: plan });
      res.json({ id: docRef.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/admin/plans/:id', verifyAdmin, async (req: any, res: any) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'assistant') {
      return res.status(403).json({ error: 'SuperAdmin access required' });
    }
    // Basic permissions check
    if (req.user.role === 'assistant' && !req.user.permissions?.includes('manage_packages')) {
      return res.status(403).json({ error: 'Missing manage_packages permission' });
    }
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
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'assistant') {
       return res.status(403).json({ error: 'SuperAdmin access required' });
    }
    // Basic permissions check
    if (req.user.role === 'assistant' && !req.user.permissions?.includes('manage_packages')) {
      return res.status(403).json({ error: 'Missing manage_packages permission' });
    }
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
      const db = getDb();
      const userDoc = await db.collection('users').doc(uid).get();
      const beforeData = userDoc.exists ? userDoc.data() : null;

      // 1. Delete from Auth
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

      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete User Error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  app.post('/api/admin/delete-student', verifyAdmin, async (req: any, res: any) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Student ID required' });
    
    try {
      const db = getDb();
      const studentDoc = await db.collection('students').doc(id).get();
      const beforeData = studentDoc.exists ? studentDoc.data() : null;
      const schoolId = beforeData?.schoolId;

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

      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete Student Error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  app.post('/api/admin/backup', verifyAdmin, async (req: any, res: any) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'SuperAdmin access required' });
    try {
      const db = getDb();
      // Define collections to backup
      const collectionsToBackup = ['schools', 'users', 'students', 'classes', 'packages', 'orders', 'payments', 'installments', 'grades', 'attendance_records'];
      
      const backupData: any = {
        timestamp: new Date().toISOString(),
        collections: {}
      };

      for (const collName of collectionsToBackup) {
        const snap = await db.collection(collName).get();
        backupData.collections[collName] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      await logAudit(req, 'MANUAL_BACKUP', { metadata: { collectionsCount: collectionsToBackup.length } });
      
      // We could also upload this JSON to Storage and return a signed URL, for now just stream it back
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=schoolixiq_backup_${new Date().toISOString().split('T')[0]}.json`);
      res.send(JSON.stringify(backupData));
    } catch (error: any) {
      console.error('Backup Error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // Helper to send emails using Nodemailer with SMTP or Firestore Fallback
  const sendEmailNotification = async (subject: string, htmlContent: string) => {
    const adminEmail = "hamzakazem1999@gmail.com";
    
    // Read SMTP settings from environment variables
    const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587;
    const user = process.env.SMTP_USER || process.env.EMAIL_USER || "hamzakazem1999@gmail.com";
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || "mkhtngtsdhrhjjgm";
    const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || user || 'no-reply@schoolixiq.com';

    if (!user || !pass) {
      console.warn(`[Email Notification Fallback] SMTP credentials not set. Unable to send real email to ${adminEmail}.`);
      console.log(`[Email Subject]: ${subject}`);
      
      // Save this notification to a "system_notifications" collection in Firestore!
      try {
        const db = getDb();
        await db.collection('system_notifications').add({
          title: subject,
          body: htmlContent,
          recipient: adminEmail,
          status: 'pending_smtp',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[Email Notification Status] Logged to 'system_notifications' collection.`);
      } catch (dbErr) {
        console.error('Failed to log system notification to Firestore:', dbErr);
      }
      return;
    }

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port: port,
      secure: port === 465,
      auth: {
        user: user,
        pass: pass
      }
    });

    try {
      const info = await transporter.sendMail({
        from: `"Schoolix Notifications" <${from}>`,
        to: adminEmail,
        subject: subject,
        html: htmlContent
      });
      console.log(`Email notification sent successfully to ${adminEmail}. MessageID: ${info.messageId}`);
      
      // Update system_notifications log as sent
      try {
        const db = getDb();
        await db.collection('system_notifications').add({
          title: subject,
          body: htmlContent,
          recipient: adminEmail,
          status: 'sent',
          messageId: info.messageId,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (ignore) {}
    } catch (err: any) {
      console.warn(`[SMTP Warning] Failed to send email to ${adminEmail}: ${err.message}. Check your email/password config (use Google App Passwords for Gmail).`);
      
      // Log as failed with error details so they can troubleshoot SMTP config
      try {
        const db = getDb();
        await db.collection('system_notifications').add({
          title: subject,
          body: htmlContent,
          recipient: adminEmail,
          status: 'failed',
          error: err.message,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (ignore) {}
    }
  };

  // Realtime subscriber and signup notifier
  const initSubscriptionNotifier = () => {
    try {
      const db = getDb();
      console.log('Initializing realtime subscription notifications listeners...');

      // 1. Listen to 'registrations' for any type of new registrations/subscriptions
      db.collection('registrations')
      .where('status', '==', 'pending')
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            // Check if we already notified for this request to prevent double execution
            if (data.notifiedAdmin === true) return;

            const docId = change.doc.id;
            const typeLabel = data.type === 'subscription_request' 
              ? 'طلب اشتراك جديد (باقة)' 
              : data.type === 'direct_school_signup'
              ? 'تسجيل مدرسة مباشر'
              : `طلب جديد (${data.type})`;

            const customerName = data.name || (data.customerInfo ? data.customerInfo.name : 'غير محدد');
            const customerPhone = data.phone || (data.customerInfo ? data.customerInfo.phone : 'غير محدد');
            const customerEmail = data.email || (data.customerInfo ? data.customerInfo.email : 'غير محدد');
            const customerAddress = data.address || (data.customerInfo ? data.customerInfo.address : 'غير محدد');
            const packageName = data.packageName || 'غير محدد';
            const price = data.price || 'غير محدد';
            const billingCycle = data.billingCycle === 'monthly' ? 'شهري' : (data.billingCycle === 'yearly' ? 'سنوي' : (data.billingCycle || 'غير محدد'));
            const subscriberCode = data.subscriberCode || 'غير محدد';

            const emailSubject = `📢 ${typeLabel} - Schoolix (${customerName})`;
            
            const htmlContent = `
              <div style="direction: rtl; font-family: 'Tahoma', 'Arial', sans-serif; text-align: right; background-color: #f6f8fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">إشعار بطلب اشتراك جديد في منصة Schoolix</h2>
                
                <p style="font-size: 16px; color: #34495e;">لقد تم استلام طلب اشتراك جديد، وفيما يلي كامل تفاصيل الطلب:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <tr style="background-color: #f2f4f8;">
                    <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd; width: 30%;">بند التفاصيل</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">القيمة / المدخلات</th>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">نوع الطلب</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #e67e22; font-weight: bold;">${typeLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">الاسم بالكامل</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">رقم الهاتف</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${customerPhone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">البريد الإلكتروني</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${customerEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">العنوان / الموقع</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${customerAddress}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">المحافظة</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${data.governorate || 'غير محدد'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">المديرية</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${data.directorate || 'غير محدد'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">المرحلة الدراسية</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${data.stage || 'غير محدد'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">وقت الدوام</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${data.shift || 'غير محدد'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">نوع الدراسة</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${data.genderType || 'غير محدد'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">العدد التقريبي للطلاب</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${data.approximateStudents || 'غير محدد'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">الباقة المطلوبة</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #2980b9; font-weight: bold;">${packageName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">سعر الاشتراك</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #27ae60; font-weight: bold;">${price} د.ع</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">دورة الفوترة</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${billingCycle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">كود المشترك (غير مكرر)</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #8e44ad; font-weight: bold;">${subscriberCode}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">معرف الطلب (Firestore)</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #7f8c8d; font-family: monospace;">${docId}</td>
                  </tr>
                </table>

                <div style="margin-top: 25px; padding: 15px; background: #e8f4fc; border-right: 5px solid #3498db; border-radius: 4px; font-size: 14px; color: #2c3e50;">
                  ⚠️ كمسير للنظام، يمكنك المتابعة إلى <strong>لوحة تحكم السوبر أدمن (Super Admin Dashboard)</strong> لتفعيل حساب هذه المدرسة أو تعديل صلاحياتها يدوياً.
                </div>
                
                <p style="margin-top: 30px; font-size: 12px; color: #95a5a6; text-align: center; border-top: 1px solid #ddd; padding-top: 15px;">
                  هذا البريد تم إرساله تلقائياً من نظام الإشعارات الذكي لمنصة Schoolix لعام 2026.
                </p>
              </div>
            `;

            try {
              // Mark as notified inside a transaction or quick update to resolve race conditions
              await change.doc.ref.update({ notifiedAdmin: true });
              
              // Trigger email
              await sendEmailNotification(emailSubject, htmlContent);
            } catch (err: any) {
              console.error(`Failed to handle registration notification for ${docId}:`, err);
            }
          }
        });
      }, (error) => {
        console.error('Error in registrations notifications listener:', error);
      });

    // 2. Listen to 'subscriptionRequests' for existing school plan changes or subscription modification requests
    db.collection('subscriptionRequests')
      .where('status', '==', 'pending')
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            // Check if we already notified for this request to prevent double execution
            if (data.notifiedAdmin === true) return;

            const docId = change.doc.id;
            const schoolName = data.schoolName || 'مدرسة غير محددة';
            const adminName = data.adminName || 'مدير غير محدد';
            const adminEmail = data.adminEmail || 'غير محدد';
            const adminPhone = data.adminPhone || 'غير محدد';
            const planId = data.planId || 'غير محدد';

            const emailSubject = `📢 طلب تفعيل اشتراك مدرسة - Schoolix (${schoolName})`;
            
            const htmlContent = `
              <div style="direction: rtl; font-family: 'Tahoma', 'Arial', sans-serif; text-align: right; background-color: #f6f8fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">طلب تفعيل باقة لمدرسة قائمة</h2>
                
                <p style="font-size: 16px; color: #34495e;">قامت مدرسة مسجلة بإرسال طلب لتفعيل / ترقية باقة اشتراكها المعلقة:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <tr style="background-color: #f2f4f8;">
                    <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd; width: 30%;">بند التفاصيل</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">القيمة / المدخلات</th>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">اسم المدرسة</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #e74c3c; font-weight: bold;">${schoolName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">مدير المدرسة (صاحب الطلب)</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${adminName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">رقم هاتف المدير</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${adminPhone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">البريد الإلكتروني للمدير</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #34495e;">${adminEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">معرف الباقة المطلوبة (Plan ID)</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #2980b9; font-weight: bold;">${planId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">معرف المدرسة (Firestore ID)</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #7f8c8d; font-family: monospace;">${data.schoolId || 'غير محدد'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #2c3e50;">معرف طلب التفعيل</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #7f8c8d; font-family: monospace;">${docId}</td>
                  </tr>
                </table>

                <div style="margin-top: 25px; padding: 15px; background: #fdf2f2; border-right: 5px solid #e74c3c; border-radius: 4px; font-size: 14px; color: #2c3e50;">
                  ⚠️ يرجى تفعيل أو مراجعة هذا الطلب من شريط طلبات الاشتراك داخل لوحة تحكم الـ Super Admin لتعديل حالة المدرسة إلى نشطة وتحديد مدة الاشتراك المناسبة.
                </div>
                
                <p style="margin-top: 30px; font-size: 12px; color: #95a5a6; text-align: center; border-top: 1px solid #ddd; padding-top: 15px;">
                  هذا البريد تم إرساله تلقائياً من نظام الإشعارات الذكي لمنصة Schoolix لعام 2026.
                </p>
              </div>
            `;

            try {
              // Mark as notified in Firestore immediately to prevent concurrent duplicate sends
              await change.doc.ref.update({ notifiedAdmin: true });

              // Send the actual email
              await sendEmailNotification(emailSubject, htmlContent);
            } catch (err: any) {
              console.error(`Failed to handle subscription request notification for ${docId}:`, err);
            }
          }
        });
      }, (error) => {
        console.error('Error in subscriptionRequests notifications listener:', error);
      });
    } catch (e) {
      console.warn('Realtime subscription notifier disabled (Firebase not fully initialized).');
    }
  };

  // Initialize background subscription notifier
  initSubscriptionNotifier();

  // Global API 404 handler - MUST be before Vite middleware
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
