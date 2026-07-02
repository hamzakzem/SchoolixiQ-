import crypto from 'crypto';

const DISTRIBUTORS_COL = 'distributors';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || '').trim();
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {{ name: string, phone: string, address: string, governorate: string, email?: string }}
 */
export async function registerDistributorApplication(db, adminSdk, input) {
  const name = String(input.name || '').trim();
  const phone = normalizePhone(input.phone);
  const address = String(input.address || '').trim();
  const governorate = String(input.governorate || '').trim();
  const email = normalizeEmail(input.email);

  if (!name || !phone || !address || !governorate) {
    const err = new Error('جميع الحقول المطلوبة يجب تعبئتها');
    err.code = 'INVALID_BODY';
    throw err;
  }

  const existingByPhone = await db
    .collection(DISTRIBUTORS_COL)
    .where('phone', '==', phone)
    .where('status', 'in', ['pending', 'active'])
    .limit(1)
    .get();
  if (!existingByPhone.empty) {
    const err = new Error('يوجد طلب أو حساب موزع مسجل بهذا الرقم مسبقاً');
    err.code = 'PHONE_ALREADY_REGISTERED';
    throw err;
  }

  if (email) {
    const existingByEmail = await db
      .collection(DISTRIBUTORS_COL)
      .where('email', '==', email)
      .where('status', 'in', ['pending', 'active'])
      .limit(1)
      .get();
    if (!existingByEmail.empty) {
      const err = new Error('يوجد طلب أو حساب موزع مسجل بهذا البريد مسبقاً');
      err.code = 'EMAIL_ALREADY_REGISTERED';
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
    email: email || '',
    status: 'pending',
    canLogin: false,
    active: false,
    commissionPercent: 10,
    source: 'self_registration',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: ref.id, status: 'pending' };
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 */
export async function listPendingDistributors(db) {
  const snap = await db
    .collection(DISTRIBUTORS_COL)
    .where('status', '==', 'pending')
    .get();
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .sort((a, b) => {
      const aSec = a.createdAt?.seconds || 0;
      const bSec = b.createdAt?.seconds || 0;
      return bSec - aSec;
    });
}

/**
 * @param {{ db: import('firebase-admin').firestore.Firestore, authAdmin: import('firebase-admin/auth').Auth, adminSdk: typeof import('firebase-admin'), distributorId: string, actorUid: string, password?: string, syncClaims: (uid: string, role: string, schoolId?: string) => Promise<void> }}
 */
export async function approveDistributor({
  db,
  authAdmin,
  adminSdk,
  distributorId,
  actorUid,
  password,
  syncClaims,
}) {
  const ref = db.collection(DISTRIBUTORS_COL).doc(distributorId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error('DISTRIBUTOR_NOT_FOUND');
    err.code = 'DISTRIBUTOR_NOT_FOUND';
    throw err;
  }

  const data = snap.data() || {};
  if (data.status === 'active' && data.canLogin === true) {
    return { alreadyActive: true, distributorId, userId: data.userId || null };
  }
  if (data.status === 'rejected') {
    const err = new Error('DISTRIBUTOR_REJECTED');
    err.code = 'DISTRIBUTOR_REJECTED';
    throw err;
  }

  const FieldValue = adminSdk.firestore.FieldValue;
  let userId = String(data.userId || '').trim();
  const email = normalizeEmail(data.email);
  const displayName = String(data.name || 'موزع');

  if (!userId && email) {
    let uid = '';
    const securePass =
      String(password || '').trim() || `${crypto.randomBytes(16).toString('hex')}SecureP1!`;

    try {
      const existing = await authAdmin.getUserByEmail(email);
      uid = existing.uid;
      const updateParams = { emailVerified: true, displayName };
      if (password) {
        updateParams.password = password;
      } else {
        const hasPassword = existing.providerData.some((p) => p.providerId === 'password');
        if (!hasPassword) updateParams.password = securePass;
      }
      await authAdmin.updateUser(uid, updateParams);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        const created = await authAdmin.createUser({
          email,
          password: securePass,
          displayName,
          emailVerified: true,
        });
        uid = created.uid;
      } else {
        throw authError;
      }
    }

    await db.collection('users').doc(uid).set(
      {
        uid,
        email,
        name: displayName,
        role: 'distributor',
        distributorId,
        phone: data.phone || '',
        status: 'active',
        schoolId: '',
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await syncClaims(uid, 'distributor', '');
    userId = uid;
  }

  await ref.update({
    status: 'active',
    canLogin: true,
    active: true,
    ...(userId ? { userId } : {}),
    approvedAt: FieldValue.serverTimestamp(),
    approvedBy: actorUid,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    alreadyActive: false,
    distributorId,
    userId: userId || null,
    userCreated: Boolean(userId),
    needsEmailForLogin: !userId,
  };
}

/**
 * @param {{ db: import('firebase-admin').firestore.Firestore, adminSdk: typeof import('firebase-admin'), distributorId: string, actorUid: string, reason?: string }}
 */
export async function rejectDistributor({ db, adminSdk, distributorId, actorUid, reason }) {
  const ref = db.collection(DISTRIBUTORS_COL).doc(distributorId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error('DISTRIBUTOR_NOT_FOUND');
    err.code = 'DISTRIBUTOR_NOT_FOUND';
    throw err;
  }

  const FieldValue = adminSdk.firestore.FieldValue;
  await ref.update({
    status: 'rejected',
    canLogin: false,
    active: false,
    rejectedAt: FieldValue.serverTimestamp(),
    rejectedBy: actorUid,
    rejectionReason: String(reason || '').trim(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { distributorId, status: 'rejected' };
}
