import crypto from 'crypto';
import { findCouponByCode, normalizeCouponCode, notifyDistributorUser } from './distributorCommissions.mjs';

const DISTRIBUTORS_COL = 'distributors';
const COUPONS_COL = 'distributorCoupons';
const COUPON_CODE_PATTERN = /^[A-Z0-9-]{3,24}$/;

function badRequest(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function percentOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Validates the terms the super admin sets when approving a distributor.
 * @returns {{ commissionPercent: number, discountPercent: number, couponCode: string } | null}
 */
function readApprovalTerms(terms) {
  if (!terms) return null;
  const commission = percentOrNull(terms.commissionPercent);
  const discount = percentOrNull(terms.discountPercent) ?? 0;
  const couponCode = normalizeCouponCode(terms.couponCode);
  if (commission === null || Number.isNaN(commission) || commission < 0 || commission > 100) {
    throw badRequest('نسبة عمولة الموزع يجب أن تكون بين 0 و 100', 'INVALID_COMMISSION');
  }
  if (Number.isNaN(discount) || discount < 0 || discount > 100) {
    throw badRequest('نسبة خصم الكوبون يجب أن تكون بين 0 و 100', 'INVALID_DISCOUNT');
  }
  if (!COUPON_CODE_PATTERN.test(couponCode)) {
    throw badRequest('كود الكوبون: 3–24 حرفاً إنجليزياً أو رقماً أو شرطة', 'INVALID_COUPON_CODE');
  }
  return { commissionPercent: commission, discountPercent: discount, couponCode };
}

async function notifySuperAdmins(db, adminSdk, { title, message, routeTarget, metadata }) {
  const admins = await db.collection('users').where('role', '==', 'superadmin').limit(20).get();
  if (admins.empty) return;
  const now = new Date();
  const batch = db.batch();
  for (const u of admins.docs) {
    batch.set(db.collection('notifications').doc(), {
      title,
      message,
      type: 'system',
      category: 'distributor',
      userId: u.id,
      recipientId: u.id,
      receiverId: u.id,
      read: false,
      routeTarget,
      metadata: { ...metadata, routeTarget },
      pushDelivery: { status: 'pending' },
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
  }
  await batch.commit();
}

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

  // Let the super admins know a request is waiting (a failed notification never fails the application)
  await notifySuperAdmins(db, adminSdk, {
    title: 'طلب موزع جديد',
    message: `${name} — ${governorate} — بانتظار الموافقة وتحديد النسبة والكوبون`,
    routeTarget: 'distributor_requests',
    metadata: { distributorId: ref.id },
  }).catch((e) => console.error('[distributors] notify super admins failed', e?.message || e));

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
 * @param {{ db: import('firebase-admin').firestore.Firestore, authAdmin: import('firebase-admin/auth').Auth, adminSdk: typeof import('firebase-admin'), distributorId: string, actorUid: string, password?: string, syncClaims: (uid: string, role: string, schoolId?: string) => Promise<void>, terms?: { commissionPercent?: unknown, discountPercent?: unknown, couponCode?: unknown, email?: unknown } }}
 */
export async function approveDistributor({
  db,
  authAdmin,
  adminSdk,
  distributorId,
  actorUid,
  password,
  syncClaims,
  terms,
}) {
  const approvalTerms = readApprovalTerms(terms);
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
  // The super admin may add the login email when the application came without one.
  const email = normalizeEmail(data.email) || normalizeEmail(terms?.email);
  const displayName = String(data.name || 'موزع');

  if (approvalTerms) {
    const existingCoupon = await findCouponByCode(db, approvalTerms.couponCode);
    if (existingCoupon && existingCoupon.distributorId !== distributorId) {
      throw badRequest('كود الكوبون مستخدم لموزع آخر — اختر كوداً مختلفاً', 'COUPON_CODE_TAKEN');
    }
  }

  if (!userId && email) {
    let uid = '';
    const securePass =
      String(password || '').trim() || `${crypto.randomBytes(16).toString('hex')}SecureP1!`;

    try {
      const existing = await authAdmin.getUserByEmail(email);
      uid = existing.uid;
      // Never convert another platform account (school admin, parent…) into a distributor.
      const existingProfile = await db.collection('users').doc(uid).get();
      const existingRole = existingProfile.exists ? String(existingProfile.data()?.role || '') : '';
      if (existingRole && existingRole !== 'distributor') {
        const err = new Error('هذا البريد مستخدم لحساب آخر في المنصة — لا يمكن تحويله إلى حساب موزع');
        err.code = 'EMAIL_IN_USE_BY_OTHER_ACCOUNT';
        throw err;
      }
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

  const batch = db.batch();
  batch.update(ref, {
    status: 'active',
    canLogin: true,
    active: true,
    ...(email && !data.email ? { email } : {}),
    ...(userId ? { userId } : {}),
    ...(approvalTerms
      ? {
          commissionPercent: approvalTerms.commissionPercent,
          discountPercent: approvalTerms.discountPercent,
          couponCode: approvalTerms.couponCode,
        }
      : {}),
    approvedAt: FieldValue.serverTimestamp(),
    approvedBy: actorUid,
    updatedAt: FieldValue.serverTimestamp(),
  });
  if (approvalTerms) {
    const existingCoupon = await findCouponByCode(db, approvalTerms.couponCode);
    const couponRef = existingCoupon
      ? db.collection(COUPONS_COL).doc(existingCoupon.id)
      : db.collection(COUPONS_COL).doc();
    batch.set(
      couponRef,
      {
        code: approvalTerms.couponCode,
        distributorId,
        distributorName: displayName,
        discountPercent: approvalTerms.discountPercent,
        commissionPercent: approvalTerms.commissionPercent,
        active: true,
        ...(existingCoupon ? {} : { redemptionCount: 0, createdAt: FieldValue.serverTimestamp() }),
        createdBy: actorUid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await batch.commit();

  if (userId) {
    await notifyDistributorUser(db, distributorId, {
      title: 'مرحباً بك في SchoolixIQ',
      message: approvalTerms
        ? `تم قبولك كموزع — كوبونك ${approvalTerms.couponCode} وعمولتك ${approvalTerms.commissionPercent}% من كل اشتراك`
        : 'تم قبولك كموزع في المنصة',
      routeTarget: 'distributor_earnings',
    }).catch((e) => console.error('[distributors] welcome notification failed', e?.message || e));
  }

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

/**
 * Removes a distributor record and its coupons. Linked schools keep their history
 * but stop accruing commission. The caller deletes the login account(s).
 * @param {{ db: import('firebase-admin').firestore.Firestore, adminSdk: typeof import('firebase-admin'), distributorId: string, actorUid: string }}
 */
export async function deleteDistributorRecords({ db, adminSdk, distributorId, actorUid }) {
  const ref = db.collection(DISTRIBUTORS_COL).doc(distributorId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw badRequest('DISTRIBUTOR_NOT_FOUND', 'DISTRIBUTOR_NOT_FOUND');
  }
  const FieldValue = adminSdk.firestore.FieldValue;
  const [coupons, schools] = await Promise.all([
    db.collection(COUPONS_COL).where('distributorId', '==', distributorId).get(),
    db.collection('schools').where('distributorId', '==', distributorId).get(),
  ]);
  const writes = [
    ...coupons.docs.map((d) => (b) => b.delete(d.ref)),
    ...schools.docs.map((d) => (b) =>
      b.update(d.ref, {
        distributorCommissionPaused: true,
        distributorDeleted: true,
        distributorDeletedAt: FieldValue.serverTimestamp(),
        distributorDeletedBy: actorUid,
      }),
    ),
    (b) => b.delete(ref),
  ];
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    writes.slice(i, i + 400).forEach((w) => w(batch));
    await batch.commit();
  }
  return { couponsDeleted: coupons.size, schoolsPaused: schools.size };
}
