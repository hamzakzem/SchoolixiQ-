/**
 * Publish firestore.rules and storage.rules with the Firebase Admin SDK.
 * Uses GOOGLE_APPLICATION_CREDENTIALS (service account JSON). Unlike
 * `firebase deploy`, this needs no Service Usage permission on the project.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'firebase-applet-config.json'), 'utf8'));

const projectId = process.env.FIREBASE_PROJECT_ID || appConfig.projectId;
const bucket = process.env.FIREBASE_STORAGE_BUCKET || appConfig.storageBucket;

admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
const rules = admin.securityRules();

const firestoreSource = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const storageSource = fs.readFileSync(path.join(root, 'storage.rules'), 'utf8');

try {
  const firestoreRuleset = await rules.releaseFirestoreRulesetFromSource(firestoreSource);
  console.log(`OK: Firestore rules released (${firestoreRuleset.name}) for project ${projectId}`);

  const storageRuleset = await rules.releaseStorageRulesetFromSource(storageSource, bucket);
  console.log(`OK: Storage rules released (${storageRuleset.name}) for bucket ${bucket}`);
} catch (error) {
  console.error('FAIL: rules deploy failed:', error?.message || error);
  process.exit(1);
}
