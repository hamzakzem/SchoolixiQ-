import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initFirebaseAdmin(config) {
  if (admin.apps.length) {
    return getDb(config);
  }

  const projectId = config.firebaseProjectId;
  let credential;

  if (config.serviceAccountPath && fs.existsSync(config.serviceAccountPath)) {
    const sa = JSON.parse(fs.readFileSync(config.serviceAccountPath, 'utf8'));
    credential = admin.credential.cert(sa);
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID || projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  } else {
  const configPath = path.join(__dirname, '../../../firebase-applet-config.json');
    admin.initializeApp({ projectId });
    return getDb(config);
  }

  admin.initializeApp({ credential, projectId });
  return getDb(config);
}

function getDb(config) {
  const databaseId = config.firestoreDatabaseId || '(default)';
  return getFirestore(admin.app(), databaseId);
}

export { admin, FieldValue };
