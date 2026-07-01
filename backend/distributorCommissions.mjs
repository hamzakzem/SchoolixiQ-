/**
 * Recurring monthly distributor commissions — server-side only.
 * Callable from admin API or a future Cloud Scheduler job (monthKey).
 */

export const COMMISSION_COLLECTION = "distributorMonthlyCommissions";
export const COUPONS_COLLECTION = "distributorCoupons";
export const DISTRIBUTORS_COLLECTION = "distributors";

/** @param {string} code */
export function normalizeCouponCode(code) {
  return String(code || "").trim().toUpperCase();
}

/** @param {string} monthKey */
export function normalizeMonthKey(monthKey) {
  const m = String(monthKey || "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) {
    const err = new Error("INVALID_MONTH_KEY");
    err.code = "INVALID_MONTH_KEY";
    throw err;
  }
  return m;
}

/** @param {string} distributorId @param {string} schoolId @param {string} monthKey */
export function buildCommissionDocId(distributorId, schoolId, monthKey) {
  return `${distributorId}_${schoolId}_${monthKey}`;
}

/** @param {number} netAmount @param {number} commissionPercent */
export function calculateCommissionAmount(netAmount, commissionPercent) {
  const net = Number(netAmount) || 0;
  const pct = Number(commissionPercent) || 0;
  return Math.round((net * pct) / 100);
}

/** @param {Record<string, unknown>} school */
export function resolveSchoolPaymentStatus(school) {
  const pay = String(school.paymentStatus || "").toLowerCase();
  if (pay) return pay;
  if (String(school.status || "").toLowerCase() === "active") return "paid";
  return "";
}

/**
 * @param {Record<string, unknown>} school
 * @returns {{ eligible: boolean, reason: string | null }}
 */
export function isSchoolCommissionEligible(school) {
  if (!school?.distributorId) {
    return { eligible: false, reason: "no_distributor" };
  }
  if (school.distributorCommissionPaused === true) {
    return { eligible: false, reason: "paused" };
  }
  const status = String(school.status || "").toLowerCase();
  if (["suspended", "inactive", "archived", "rejected"].includes(status)) {
    return { eligible: false, reason: "inactive" };
  }
  const subStatus = String(school.subscriptionStatus || "active").toLowerCase();
  if (subStatus !== "active") {
    return { eligible: false, reason: "subscription_inactive" };
  }
  const payStatus = resolveSchoolPaymentStatus(school);
  if (!["paid", "approved"].includes(payStatus)) {
    return { eligible: false, reason: "unpaid" };
  }
  return { eligible: true, reason: null };
}

/**
 * @param {Record<string, unknown>} school
 * @param {Record<string, unknown> | null | undefined} packageData
 */
export function resolveSubscriptionAmount(school, packageData) {
  const pkg = packageData || {};
  const monthly = Number(pkg.priceMonthly);
  if (monthly > 0) return monthly;
  const yearly = Number(pkg.price);
  if (yearly > 0) return Math.round(yearly / 12);
  const fromSchool = Number(school.subscriptionAmount || school.lastPaymentAmount);
  return fromSchool > 0 ? fromSchool : 0;
}

/**
 * @param {Record<string, unknown>} school
 * @param {number} subscriptionAmount
 */
export function resolveDiscountAmount(school, subscriptionAmount) {
  const fixed = Number(school.distributorDiscountAmount);
  if (fixed > 0) return Math.min(fixed, subscriptionAmount);
  const pct = Number(school.distributorDiscountPercent);
  if (pct > 0) return Math.round((subscriptionAmount * pct) / 100);
  return Number(school.discountAmount) || 0;
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {string} code
 */
export async function findCouponByCode(db, code) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const snap = await db
    .collection(COUPONS_COLLECTION)
    .where("code", "==", normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

/**
 * Link school to distributor on first coupon redemption.
 * @param {{ db: import('firebase-admin').firestore.Firestore, adminSdk: typeof import('firebase-admin'), schoolId: string, couponCode: string, actorUid?: string }}
 */
export async function applyDistributorCoupon({
  db,
  adminSdk,
  schoolId,
  couponCode,
  actorUid,
}) {
  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    const err = new Error("SCHOOL_NOT_FOUND");
    err.code = "SCHOOL_NOT_FOUND";
    throw err;
  }
  const school = schoolSnap.data() || {};
  if (school.distributorId) {
    return {
      linked: false,
      alreadyLinked: true,
      distributorId: school.distributorId,
    };
  }

  const coupon = await findCouponByCode(db, couponCode);
  if (!coupon || coupon.active === false) {
    const err = new Error("COUPON_INVALID");
    err.code = "COUPON_INVALID";
    throw err;
  }

  if (
    coupon.maxRedemptions != null &&
    Number(coupon.redemptionCount || 0) >= Number(coupon.maxRedemptions)
  ) {
    const err = new Error("COUPON_EXHAUSTED");
    err.code = "COUPON_EXHAUSTED";
    throw err;
  }

  const distributorSnap = await db
    .collection(DISTRIBUTORS_COLLECTION)
    .doc(String(coupon.distributorId))
    .get();
  if (!distributorSnap.exists) {
    const err = new Error("DISTRIBUTOR_NOT_FOUND");
    err.code = "DISTRIBUTOR_NOT_FOUND";
    throw err;
  }
  const distributor = distributorSnap.data() || {};
  if (distributor.active === false) {
    const err = new Error("DISTRIBUTOR_INACTIVE");
    err.code = "DISTRIBUTOR_INACTIVE";
    throw err;
  }

  const commissionPercent = Number(
    coupon.commissionPercent ?? distributor.commissionPercent ?? 0,
  );
  const discountPercent = Number(coupon.discountPercent ?? 0);
  const discountAmount = Number(coupon.discountAmount ?? 0);
  const FieldValue = adminSdk.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();

  await schoolRef.update({
    distributorId: String(coupon.distributorId),
    distributorName: String(distributor.name || coupon.distributorName || ""),
    distributorCouponCode: normalizeCouponCode(coupon.code || couponCode),
    distributorLinkedAt: now,
    distributorCommissionPercent: commissionPercent,
    distributorCommissionType: "recurring_monthly",
    ...(discountPercent > 0 ? { distributorDiscountPercent: discountPercent } : {}),
    ...(discountAmount > 0 ? { distributorDiscountAmount: discountAmount } : {}),
    distributorCommissionPaused: false,
    updatedAt: now,
    ...(actorUid ? { distributorLinkedBy: actorUid } : {}),
  });

  await db
    .collection(COUPONS_COLLECTION)
    .doc(coupon.id)
    .set(
      {
        redemptionCount: FieldValue.increment(1),
        lastRedeemedAt: now,
        lastRedeemedSchoolId: schoolId,
      },
      { merge: true },
    );

  return {
    linked: true,
    alreadyLinked: false,
    distributorId: String(coupon.distributorId),
    commissionPercent,
  };
}

/**
 * Manual or scheduled monthly commission generation.
 * @param {{ db: import('firebase-admin').firestore.Firestore, adminSdk: typeof import('firebase-admin'), monthKey: string }}
 */
export async function generateMonthlyCommissions({ db, adminSdk, monthKey }) {
  const normalizedMonth = normalizeMonthKey(monthKey);
  const FieldValue = adminSdk.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();

  const schoolsSnap = await db
    .collection("schools")
    .where("distributorCommissionType", "==", "recurring_monthly")
    .get();

  const counts = {
    generated: 0,
    skippedInactive: 0,
    skippedUnpaid: 0,
    alreadyExists: 0,
    monthKey: normalizedMonth,
  };

  const packageCache = new Map();

  for (const schoolDoc of schoolsSnap.docs) {
    const school = schoolDoc.data() || {};
    const schoolId = schoolDoc.id;
    const distributorId = String(school.distributorId || "");
    if (!distributorId) continue;

    const eligibility = isSchoolCommissionEligible(school);
    if (!eligibility.eligible) {
      if (
        eligibility.reason === "unpaid" ||
        eligibility.reason === "subscription_inactive"
      ) {
        counts.skippedUnpaid += 1;
      } else {
        counts.skippedInactive += 1;
      }
      continue;
    }

    const docId = buildCommissionDocId(distributorId, schoolId, normalizedMonth);
    const commissionRef = db.collection(COMMISSION_COLLECTION).doc(docId);
    const existing = await commissionRef.get();
    if (existing.exists) {
      counts.alreadyExists += 1;
      continue;
    }

    const planId = String(school.planId || "basic");
    let packageData = packageCache.get(planId);
    if (packageData === undefined) {
      const pkgSnap = await db.collection("packages").doc(planId).get();
      packageData = pkgSnap.exists ? pkgSnap.data() : {};
      packageCache.set(planId, packageData);
    }

    const subscriptionAmount = resolveSubscriptionAmount(school, packageData);
    const discountAmount = resolveDiscountAmount(school, subscriptionAmount);
    const netAmount = Math.max(0, subscriptionAmount - discountAmount);
    const commissionPercent = Number(school.distributorCommissionPercent || 0);
    const commissionAmount = calculateCommissionAmount(netAmount, commissionPercent);

    await commissionRef.set({
      id: docId,
      distributorId,
      distributorName: String(school.distributorName || ""),
      schoolId,
      schoolName: String(school.name || ""),
      monthKey: normalizedMonth,
      planId,
      planName: String(packageData?.name || planId),
      subscriptionAmount,
      discountAmount,
      netAmount,
      commissionPercent,
      commissionAmount,
      status: "earned",
      generatedAt: now,
      earnedAt: now,
      paidAt: null,
      paidBy: null,
      canceledAt: null,
      notes: "",
    });

    counts.generated += 1;
  }

  return counts;
}

/**
 * @param {{ db: import('firebase-admin').firestore.Firestore, adminSdk: typeof import('firebase-admin'), commissionId: string, paidBy: string, notes?: string }}
 */
export async function markCommissionPaid({
  db,
  adminSdk,
  commissionId,
  paidBy,
  notes,
}) {
  const ref = db.collection(COMMISSION_COLLECTION).doc(commissionId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error("COMMISSION_NOT_FOUND");
    err.code = "COMMISSION_NOT_FOUND";
    throw err;
  }
  const data = snap.data() || {};
  if (data.status === "paid") {
    return { updated: false, alreadyPaid: true, id: commissionId };
  }
  if (data.status === "canceled") {
    const err = new Error("COMMISSION_CANCELED");
    err.code = "COMMISSION_CANCELED";
    throw err;
  }

  const FieldValue = adminSdk.firestore.FieldValue;
  await ref.update({
    status: "paid",
    paidAt: FieldValue.serverTimestamp(),
    paidBy,
    ...(notes ? { notes: String(notes) } : {}),
  });

  return { updated: true, alreadyPaid: false, id: commissionId };
}

/**
 * @param {{ db: import('firebase-admin').firestore.Firestore, adminSdk: typeof import('firebase-admin'), distributorId: string, monthKey: string, paidBy: string, notes?: string }}
 */
export async function markDistributorMonthCommissionsPaid({
  db,
  adminSdk,
  distributorId,
  monthKey,
  paidBy,
  notes,
}) {
  const normalizedMonth = normalizeMonthKey(monthKey);
  const snap = await db
    .collection(COMMISSION_COLLECTION)
    .where("distributorId", "==", distributorId)
    .where("monthKey", "==", normalizedMonth)
    .get();

  let updated = 0;
  let skipped = 0;
  for (const docSnap of snap.docs) {
    const status = docSnap.data()?.status;
    if (status === "paid" || status === "canceled") {
      skipped += 1;
      continue;
    }
    await markCommissionPaid({
      db,
      adminSdk,
      commissionId: docSnap.id,
      paidBy,
      notes,
    });
    updated += 1;
  }

  return { updated, skipped, distributorId, monthKey: normalizedMonth };
}

/**
 * @param {{ db: import('firebase-admin').firestore.Firestore, adminSdk: typeof import('firebase-admin'), schoolId: string, paused: boolean, pausedBy: string }}
 */
export async function setSchoolDistributorCommissionPaused({
  db,
  adminSdk,
  schoolId,
  paused,
  pausedBy,
}) {
  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    const err = new Error("SCHOOL_NOT_FOUND");
    err.code = "SCHOOL_NOT_FOUND";
    throw err;
  }
  const school = schoolSnap.data() || {};
  if (!school.distributorId) {
    const err = new Error("SCHOOL_NOT_LINKED");
    err.code = "SCHOOL_NOT_LINKED";
    throw err;
  }

  const FieldValue = adminSdk.firestore.FieldValue;
  const update = {
    distributorCommissionPaused: paused === true,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (paused) {
    update.distributorCommissionPausedAt = FieldValue.serverTimestamp();
    update.distributorCommissionPausedBy = pausedBy;
  } else {
    update.distributorCommissionPausedAt = null;
    update.distributorCommissionPausedBy = null;
  }

  await schoolRef.update(update);
  return { schoolId, paused: paused === true };
}
