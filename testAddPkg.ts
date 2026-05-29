import admin from 'firebase-admin';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function addPkg() {
    console.log("Adding...");
    const ref = await db.collection("packages").add({
        name: "Test Package",
        price: 15000,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        active: true
    });
    console.log("Added:", ref.id);
}
addPkg().catch(console.error);
