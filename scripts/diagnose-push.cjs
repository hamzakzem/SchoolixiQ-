/**
 * Read-only push pipeline diagnostic (requires Firebase Admin credentials in env).
 * Usage: node scripts/diagnose-push.cjs
 */
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: firebaseConfig.projectId });
}

const db = getFirestore(admin.app(), DATABASE_ID);

async function main() {
  console.log('=== SchoolixIQ Push Diagnostic ===');
  console.log('Database ID:', DATABASE_ID);

  const notifSnap = await db
    .collection('notifications')
    .orderBy('createdAt', 'desc')
    .limit(8)
    .get();

  console.log('\n--- Recent notifications ---');
  if (notifSnap.empty) {
    console.log('No notifications found.');
  } else {
    notifSnap.docs.forEach((d) => {
      const n = d.data();
      console.log({
        id: d.id,
        userId: n.userId,
        type: n.type,
        pushDelivery: n.pushDelivery,
        pushDispatched: n.pushDispatched,
        createdAt: n.createdAt?.toDate?.()?.toISOString?.() || n.createdAt,
      });
    });
  }

  const usersSnap = await db.collection('users').limit(5).get();
  console.log('\n--- Sample user token counts ---');
  usersSnap.docs.forEach((d) => {
    const u = d.data();
    const tokens = Array.isArray(u.fcmTokens) ? u.fcmTokens : [];
    console.log({
      uid: d.id,
      role: u.role,
      tokenCount: tokens.length,
      tokenPrefix: tokens[0] ? String(tokens[0]).slice(0, 14) + '…' : null,
    });
  });

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Diagnostic failed (need FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY or ADC):', err.message);
  process.exit(1);
});
