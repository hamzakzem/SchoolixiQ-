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

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** @param {Record<string, unknown>} distributor */
export function assertDistributorApprovedForCoupons(distributor) {
  const status = String(distributor.status || "").toLowerCase();
  if (status === "pending") {
    const err = new Error("DISTRIBUTOR_PENDING");
    err.code = "DISTRIBUTOR_PENDING";
    throw err;
  }
  if (status === "rejected" || distributor.canLogin === false) {
    const err = new Error("DISTRIBUTOR_INACTIVE");
    err.code = "DISTRIBUTOR_INACTIVE";
    throw err;
  }
  if (distributor.active === false) {
    const err = new Error("DISTRIBUTOR_INACTIVE");
    err.code = "DISTRIBUTOR_INACTIVE";
    throw err;
  }
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

/** @param {Record<string, unknown>} coupon @param {string} [normalizedCode] */
export function validateCouponForRedemption(coupon, normalizedCode) {
  if (!coupon) {
    const err = new Error("كوبون غير موجود");
    err.code = "COUPON_NOT_FOUND";
    throw err;
  }
  if (coupon.active === false) {
    const err = new Error("الكوبون غير نشط");
    err.code = "COUPON_INACTIVE";
    throw err;
  }
  const maxUses = coupon.maxUses ?? coupon.maxRedemptions;
  if (maxUses != null && Number(coupon.redemptionCount || 0) >= Number(maxUses)) {
    const err = new Error("تم استنفاد عدد استخدامات الكوبون");
    err.code = "COUPON_EXHAUSTED";
    throw err;
  }
  if (coupon.expiresAt) {
    let expiry = coupon.expiresAt;
    if (typeof expiry?.toDate === "function") expiry = expiry.toDate();
    else expiry = new Date(expiry);
    if (expiry instanceof Date && !Number.isNaN(expiry.getTime()) && expiry < new Date()) {
      const err = new Error("انتهت صلاحية الكوبون");
      err.code = "COUPON_EXPIRED";
      throw err;
    }
  }
  if (!coupon.distributorId) {
    const err = new Error("الكوبون غير مربوط بموزع");
    err.code = "COUPON_NO_DISTRIBUTOR";
    throw err;
  }
  if (normalizedCode && coupon.code && normalizeCouponCode(coupon.code) !== normalizedCode) {
    const err = new Error("كوبون غير موجود");
    err.code = "COUPON_NOT_FOUND";
    throw err;
  }
  return true;
}

/** @param {Record<string, unknown>} school */
export function isDistributorTrackedSchool(school) {
  if (!school) return false;
  if (school.trackingSource === "direct") return false;
  if (school.trackingSource === "distributor") return Boolean(school.distributorId);
  return Boolean(school.distributorId);
}

/** Direct registration — no distributor, no discount, no commission. */
export function buildDirectTrackingFields() {
  return {
    distributorId: null,
    distributorName: null,
    couponCode: null,
    distributorCouponCode: null,
    discountPercent: 0,
    discountAmount: 0,
    commissionPercent: 0,
    trackingSource: "direct",
    distributorCommissionPercent: 0,
    distributorDiscountPercent: 0,
    distributorDiscountAmount: 0,
    distributorCommissionType: null,
    distributorCommissionPaused: false,
  };
}

/**
 * @param {Record<string, unknown>} coupon
 * @param {Record<string, unknown>} distributor
 */
export function buildDistributorTrackingFields(coupon, distributor, couponCode) {
  const commissionPercent = Number(
    coupon.commissionPercent ?? distributor.commissionPercent ?? 0,
  );
  const discountPercent = Number(coupon.discountPercent ?? 0);
  const fixedDiscountAmount = Number(coupon.discountAmount ?? 0);
  const normalizedCode = normalizeCouponCode(coupon.code || couponCode);
  return {
    distributorId: String(coupon.distributorId),
    distributorName: String(distributor.name || coupon.distributorName || ""),
    couponCode: normalizedCode,
    distributorCouponCode: normalizedCode,
    discountPercent,
    discountAmount: fixedDiscountAmount,
    commissionPercent,
    trackingSource: "distributor",
    distributorCommissionPercent: commissionPercent,
    distributorCommissionType: "recurring_monthly",
    distributorCommissionPaused: false,
    ...(discountPercent > 0 ? { distributorDiscountPercent: discountPercent } : {}),
    ...(fixedDiscountAmount > 0 ? { distributorDiscountAmount: fixedDiscountAmount } : {}),
  };
}

/**
 * Validate coupon code without redeeming (pre-activation check).
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {string} code
 */
export async function validateDistributorCouponCode(db, code) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) {
    const err = new Error("COUPON_REQUIRED");
    err.code = "COUPON_REQUIRED";
    throw err;
  }
  const coupon = await findCouponByCode(db, normalized);
  validateCouponForRedemption(coupon, normalized);

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
  assertDistributorApprovedForCoupons(distributor);

  return {
    ok: true,
    code: normalized,
    distributorId: String(coupon.distributorId),
    distributorName: String(distributor.name || coupon.distributorName || ""),
    discountPercent: Number(coupon.discountPercent ?? 0),
    commissionPercent: Number(
      coupon.commissionPercent ?? distributor.commissionPercent ?? 0,
    ),
  };
}

/**
 * Set tracking fields after school activation — coupon link or direct only (no commission).
 * @param {{ db: import('firebase-admin').firestore.Firestore, adminSdk: typeof import('firebase-admin'), schoolId: string, couponCode?: string | null, actorUid?: string }}
 */
export async function finalizeSchoolDistributorTracking({
  db,
  adminSdk,
  schoolId,
  couponCode,
  actorUid,
}) {
  const normalized = normalizeCouponCode(couponCode || "");
  if (normalized) {
    return applyDistributorCoupon({
      db,
      adminSdk,
      schoolId,
      couponCode: normalized,
      actorUid,
    });
  }

  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    const err = new Error("SCHOOL_NOT_FOUND");
    err.code = "SCHOOL_NOT_FOUND";
    throw err;
  }
  const school = schoolSnap.data() || {};
  if (isDistributorTrackedSchool(school)) {
    return {
      trackingSource: "distributor",
      alreadyLinked: true,
      distributorId: school.distributorId,
    };
  }

  const FieldValue = adminSdk.firestore.FieldValue;
  await schoolRef.update({
    ...buildDirectTrackingFields(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    trackingSource: "direct",
    linked: false,
    alreadyLinked: false,
  };
}

/**
 * @param {Record<string, unknown>} school
 * @returns {{ eligible: boolean, reason: string | null }}
 */
export function isSchoolCommissionEligible(school) {
  if (!isDistributorTrackedSchool(school)) {
    return {
      eligible: false,
      reason: school?.trackingSource === "direct" ? "direct_tracking" : "no_distributor",
    };
  }
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
  const pct = Number(school.discountPercent ?? school.distributorDiscountPercent);
  if (pct > 0) return Math.round((subscriptionAmount * pct) / 100);
  const fixed = Number(school.distributorDiscountAmount);
  if (fixed > 0) return Math.min(fixed, subscriptionAmount);
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
 * Link school to distributor + apply discount only (no commission accrual).
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
  validateCouponForRedemption(coupon, normalizeCouponCode(couponCode));

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
  assertDistributorApprovedForCoupons(distributor);

  const trackingFields = buildDistributorTrackingFields(
    coupon,
    distributor,
    couponCode,
  );
  const commissionPercent = trackingFields.commissionPercent;
  const planId = String(school.planId || "basic");
  const pkgSnap = await db.collection("packages").doc(planId).get();
  const packageData = pkgSnap.exists ? pkgSnap.data() : {};
  const subscriptionAmount = resolveSubscriptionAmount(school, packageData);
  const computedDiscountAmount = resolveDiscountAmount(
    { ...school, ...trackingFields },
    subscriptionAmount,
  );
  if (computedDiscountAmount > 0) {
    trackingFields.discountAmount = computedDiscountAmount;
  }
  const FieldValue = adminSdk.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();

  await schoolRef.update({
    ...trackingFields,
    distributorLinkedAt: now,
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
    trackingSource: "distributor",
    distributorId: String(coupon.distributorId),
    commissionPercent,
    discountPercent: trackingFields.discountPercent,
    discountAmount: trackingFields.discountAmount || 0,
    commissionAccrued: false,
  };
}

/**
 * Build commission row payload (pure calculation).
 * @param {Record<string, unknown>} school
 * @param {string} schoolId
 * @param {Record<string, unknown>} packageData
 * @param {string} monthKey
 */
export function buildCommissionPayload(school, schoolId, packageData, monthKey) {
  const distributorId = String(school.distributorId || "");
  const subscriptionAmount = resolveSubscriptionAmount(school, packageData);
  const discountAmount = resolveDiscountAmount(school, subscriptionAmount);
  const netAmount = Math.max(0, subscriptionAmount - discountAmount);
  const commissionPercent = Number(
    school.commissionPercent ?? school.distributorCommissionPercent ?? 0,
  );
  const commissionAmount = calculateCommissionAmount(netAmount, commissionPercent);
  const planId = String(school.planId || "basic");
  const docId = buildCommissionDocId(distributorId, schoolId, monthKey);

  return {
    docId,
    subscriptionAmount,
    discountAmount,
    netAmount,
    commissionPercent,
    commissionAmount,
    payload: {
      id: docId,
      distributorId,
      distributorName: String(school.distributorName || ""),
      schoolId,
      schoolName: String(school.name || ""),
      monthKey,
      planId,
      planName: String(packageData?.name || planId),
      subscriptionAmount,
      discountAmount,
      netAmount,
      commissionPercent,
      commissionAmount,
      status: "earned",
      paidAt: null,
      paidBy: null,
      canceledAt: null,
      notes: "",
    },
  };
}

/**
 * Accrue distributor commission ONLY after payment is confirmed.
 * @param {{ db: import('firebase-admin').firestore.Firestore, adminSdk: typeof import('firebase-admin'), schoolId: string, paidBy?: string, monthKey?: string }}
 */
export async function createCommissionOnPaymentConfirmed({
  db,
  adminSdk,
  schoolId,
  paidBy,
  monthKey,
}) {
  const normalizedMonth = normalizeMonthKey(monthKey || currentMonthKey());
  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    const err = new Error("SCHOOL_NOT_FOUND");
    err.code = "SCHOOL_NOT_FOUND";
    throw err;
  }

  const school = schoolSnap.data() || {};
  if (!isDistributorTrackedSchool(school)) {
    return { created: false, reason: "not_distributor_tracked" };
  }

  const eligibility = isSchoolCommissionEligible(school);
  if (!eligibility.eligible) {
    return { created: false, reason: eligibility.reason || "not_eligible" };
  }

  const distributorId = String(school.distributorId || "");
  const docId = buildCommissionDocId(distributorId, schoolId, normalizedMonth);
  const commissionRef = db.collection(COMMISSION_COLLECTION).doc(docId);
  const existing = await commissionRef.get();
  if (existing.exists) {
    return {
      created: false,
      alreadyExists: true,
      commissionId: docId,
      monthKey: normalizedMonth,
    };
  }

  const planId = String(school.planId || "basic");
  const pkgSnap = await db.collection("packages").doc(planId).get();
  const packageData = pkgSnap.exists ? pkgSnap.data() : {};
  const built = buildCommissionPayload(school, schoolId, packageData, normalizedMonth);
  const FieldValue = adminSdk.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();

  await commissionRef.set({
    ...built.payload,
    generatedAt: now,
    earnedAt: now,
    ...(paidBy ? { paymentConfirmedBy: paidBy } : {}),
  });

  await schoolRef.update({
    distributorLastCommissionMonth: normalizedMonth,
    distributorLastCommissionAmount: built.commissionAmount,
    updatedAt: now,
  });

  return {
    created: true,
    commissionId: docId,
    monthKey: normalizedMonth,
    netAmount: built.netAmount,
    commissionAmount: built.commissionAmount,
    commissionPercent: built.commissionPercent,
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

  const [legacySnap, trackedSnap] = await Promise.all([
    db.collection("schools").where("distributorCommissionType", "==", "recurring_monthly").get(),
    db.collection("schools").where("trackingSource", "==", "distributor").get(),
  ]);
  const schoolDocMap = new Map();
  for (const schoolDoc of [...legacySnap.docs, ...trackedSnap.docs]) {
    schoolDocMap.set(schoolDoc.id, schoolDoc);
  }

  const counts = {
    generated: 0,
    skippedInactive: 0,
    skippedUnpaid: 0,
    alreadyExists: 0,
    monthKey: normalizedMonth,
  };

  const packageCache = new Map();

  for (const schoolDoc of schoolDocMap.values()) {
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
    const commissionPercent = Number(
      school.commissionPercent ?? school.distributorCommissionPercent ?? 0,
    );
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
