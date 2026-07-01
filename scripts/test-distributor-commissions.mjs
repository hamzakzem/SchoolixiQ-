/**
 * Unit tests for distributor commission pure functions (no Firestore).
 * Run: node scripts/test-distributor-commissions.mjs
 */
import {
  buildCommissionDocId,
  calculateCommissionAmount,
  isSchoolCommissionEligible,
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

assert(
  resolveSubscriptionAmount({}, { priceMonthly: 150000 }) === 150000,
  "subscription from priceMonthly",
);
assert(
  resolveDiscountAmount({ distributorDiscountPercent: 10 }, 100000) === 10000,
  "discount percent",
);
assert(
  resolveDiscountAmount({ distributorDiscountAmount: 5000 }, 100000) === 5000,
  "discount fixed",
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
