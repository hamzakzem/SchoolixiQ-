const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Cloud Function to send push notifications and clean up dead tokens automatically.
 */
exports.sendNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notificationData = snap.data();
    const userId = notificationData.userId;
    const title = notificationData.title;
    const body = notificationData.body;

    if (!userId) return null;

    const userDocRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) return null;

    const tokens = userDoc.data().fcmTokens || [];
    if (tokens.length === 0) return null;

    const payload = {
      notification: { title, body }
    };

    const response = await admin.messaging().sendToDevice(tokens, payload);

    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error && (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered')) {
        tokensToRemove.push(tokens[index]);
      }
    });

    if (tokensToRemove.length > 0) {
      await userDocRef.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
      });
    }

    return null;
  });

/**
 * Enforces Student Limit using a Firebase Trigger.
 * Whenever a new student is added, we verify if the school has reached its limit.
 */
exports.enforceStudentLimit = functions.firestore
  .document('students/{studentId}')
  .onCreate(async (snap, context) => {
    const newStudent = snap.data();
    const schoolId = newStudent.schoolId;
    if (!schoolId) return;

    const db = admin.firestore();
    const schoolRef = db.collection('schools').doc(schoolId);
    
    await db.runTransaction(async (transaction) => {
       const schoolDoc = await transaction.get(schoolRef);
       if (!schoolDoc.exists) return;

       const schoolData = schoolDoc.data();
       const planId = schoolData.planId || 'basic';
       const packageDoc = await transaction.get(db.collection('packages').doc(planId));
       
       if (!packageDoc.exists) return;
       const maxStudents = packageDoc.data().maxStudents || 0;

       // Important Note: Relying exclusively on transactions this way requires you to keep
       // a counter `studentCount` field inside the school document itself.
       // Alternatively, for robust security, you can reject the write if limit is reached.
       
       const currentCount = (schoolData.studentCount || 0);

       if (currentCount >= maxStudents) {
         // Reject creation - revert the document addition
         // We do this by throwing an error in an onCreate, wait - onCreate is post-write.
         // If you want PRE-WRITE blocking, you must use a Callable Function instead of simple Firestore rules.
         // For now, if someone forces a write through API, we delete it immediately.
         transaction.delete(snap.ref);
         console.warn(`Deleted student ${context.params.studentId} because school ${schoolId} exceeded max limit of ${maxStudents}.`);
       } else {
         transaction.update(schoolRef, { studentCount: currentCount + 1 });
       }
    });
});

/**
 * Decrement student count on deletion
 */
exports.decrementStudentCount = functions.firestore
  .document('students/{studentId}')
  .onDelete(async (snap, context) => {
     const student = snap.data();
     const schoolId = student.schoolId;
     if (!schoolId) return;
     
     const db = admin.firestore();
     const schoolRef = db.collection('schools').doc(schoolId);
     
     await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(schoolRef);
        if (doc.exists) {
           const count = doc.data().studentCount || 1;
           transaction.update(schoolRef, { studentCount: Math.max(0, count - 1) });
        }
     });
});
