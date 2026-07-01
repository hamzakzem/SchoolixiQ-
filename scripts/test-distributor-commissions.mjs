/**
 * Unit tests for distributor commission pure functions (no Firestore).
 * Run: node scripts/test-distributor-commissions.mjs
 */
import {
  buildCommissionDocId,
  buildCommissionPayload,
  calculateCommissionAmount,
  isSchoolCommissionEligible,
  isDistributorTrackedSchool,
  validateCouponForRedemption,
  buildDirectTrackingFields,
  buildDistributorTrackingFields,
  currentMonthKey,
  normalizeMonthKey,
  resolveDiscountAmount,
  resolveSubscriptionAmount,
} from "../backend/distributorCommissions.mjs";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  OK: ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL: ${msg}`);
  }
}

console.log("distributorCommissions unit tests\n");

assert(
  buildCommissionDocId("dist1", "school1", "2026-07") === "dist1_school1_2026-07",
  "buildCommissionDocId",
);

assert(calculateCommissionAmount(100000, 10) === 10000, "calculateCommissionAmount 10%");
assert(calculateCommissionAmount(90000, 15) === 13500, "calculateCommissionAmount 15%");

try {
  normalizeMonthKey("2026-13");
  assert(false, "invalid month should throw");
} catch {
  assert(true, "invalid month throws");
}
assert(normalizeMonthKey("2026-07") === "2026-07", "normalizeMonthKey valid");

const activePaidSchool = {
  distributorId: "d1",
  status: "active",
  subscriptionStatus: "active",
  paymentStatus: "paid",
};
assert(isSchoolCommissionEligible(activePaidSchool).eligible, "active paid school eligible");

const pausedSchool = { ...activePaidSchool, distributorCommissionPaused: true };
assert(!isSchoolCommissionEligible(pausedSchool).eligible, "paused school not eligible");

const unpaidSchool = { ...activePaidSchool, paymentStatus: "pending" };
assert(!isSchoolCommissionEligible(unpaidSchool).eligible, "unpaid school not eligible");

const inactiveSchool = { ...activePaidSchool, status: "suspended" };
assert(!isSchoolCommissionEligible(inactiveSchool).eligible, "suspended school not eligible");

const directSchool = {
  distributorId: null,
  trackingSource: "direct",
  status: "active",
  subscriptionStatus: "active",
  paymentStatus: "paid",
};
assert(!isSchoolCommissionEligible(directSchool).eligible, "direct school no commission");
assert(!isDistributorTrackedSchool(directSchool), "direct school not distributor tracked");

const distributorSchool = {
  distributorId: "d1",
  trackingSource: "distributor",
  discountPercent: 10,
  commissionPercent: 5,
  status: "active",
  subscriptionStatus: "active",
  paymentStatus: "paid",
};
assert(isDistributorTrackedSchool(distributorSchool), "distributor tracked school");
assert(isSchoolCommissionEligible(distributorSchool).eligible, "distributor tracked eligible");

try {
  validateCouponForRedemption(null, "ABC");
  assert(false, "null coupon should throw");
} catch (e) {
  assert(e.code === "COUPON_NOT_FOUND", "null coupon COUPON_NOT_FOUND");
}

try {
  validateCouponForRedemption({ active: false, distributorId: "d1" }, "ABC");
  assert(false, "inactive coupon should throw");
} catch (e) {
  assert(e.code === "COUPON_INACTIVE", "inactive coupon COUPON_INACTIVE");
}

try {
  validateCouponForRedemption(
    { active: true, distributorId: "d1", maxUses: 1, redemptionCount: 1 },
    "ABC",
  );
  assert(false, "exhausted coupon should throw");
} catch (e) {
  assert(e.code === "COUPON_EXHAUSTED", "exhausted coupon COUPON_EXHAUSTED");
}

const directFields = buildDirectTrackingFields();
assert(directFields.trackingSource === "direct", "direct tracking source");
assert(directFields.discountPercent === 0, "direct zero discount");
assert(directFields.commissionPercent === 0, "direct zero commission");

const distFields = buildDistributorTrackingFields(
  { distributorId: "d1", code: "556HHJ", discountPercent: 10, commissionPercent: 5 },
  { name: "عبدالله" },
  "556HHJ",
);
assert(distFields.trackingSource === "distributor", "distributor tracking source");
assert(distFields.discountPercent === 10, "distributor discount percent");
assert(distFields.commissionPercent === 5, "distributor commission percent");
assert(distFields.distributorName === "عبدالله", "distributor name from record");

assert(
  resolveDiscountAmount({ discountPercent: 10 }, 100000) === 10000,
  "discount from canonical discountPercent",
);
assert(
  calculateCommissionAmount(90000, 5) === 4500,
  "commission 5% of net 90000",
);

const built = buildCommissionPayload(
  {
    distributorId: "d1",
    distributorName: "عبدالله",
    name: "مدرسة تجريبية",
    planId: "basic",
    discountPercent: 10,
    commissionPercent: 5,
    trackingSource: "distributor",
    status: "active",
    subscriptionStatus: "active",
    paymentStatus: "paid",
  },
  "school1",
  { name: "أساسية", priceMonthly: 100000 },
  currentMonthKey(),
);
assert(built.netAmount === 90000, "buildCommissionPayload net after 10% discount");
assert(built.commissionAmount === 4500, "buildCommissionPayload commission 5% of net");
assert(
  built.docId === buildCommissionDocId("d1", "school1", built.payload.monthKey),
  "buildCommissionPayload doc id",
);

assert(currentMonthKey().match(/^\d{4}-\d{2}$/), "currentMonthKey format");
assert(
  resolveDiscountAmount({ distributorDiscountPercent: 10 }, 100000) === 10000,
  "legacy discount percent",
);
assert(
  resolveSubscriptionAmount({}, { priceMonthly: 150000 }) === 150000,
  "subscription from priceMonthly",
);

const docId1 = buildCommissionDocId("d", "s", "2026-01");
const docId2 = buildCommissionDocId("d", "s", "2026-02");
assert(docId1 !== docId2, "different months different doc ids");
assert(
  docId1 === buildCommissionDocId("d", "s", "2026-01"),
  "same month same doc id (dedup)",
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
