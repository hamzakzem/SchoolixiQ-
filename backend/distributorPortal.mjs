const COMMISSIONS_COL = 'distributorMonthlyCommissions';
const DISTRIBUTORS_COL = 'distributors';
const SCHOOLS_COL = 'schools';
const PACKAGES_COL = 'packages';

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function schoolIsActive(school) {
  const status = String(school.status || '').toLowerCase();
  if (['suspended', 'inactive', 'archived', 'rejected'].includes(status)) return false;
  const sub = String(school.subscriptionStatus || 'active').toLowerCase();
  if (sub !== 'active') return false;
  const pay = String(school.paymentStatus || 'paid').toLowerCase();
  return ['paid', 'approved'].includes(pay);
}

export async function resolveDistributorContext(db, uid) {
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    const err = new Error('ملف المستخدم غير موجود');
    err.code = 'USER_NOT_FOUND';
    err.status = 403;
    throw err;
  }
  const userData = userSnap.data() || {};
  if (userData.role !== 'distributor') {
    const err = new Error('غير مصرح — حساب موزع فقط');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }
  const distributorId = String(userData.distributorId || '').trim();
  if (!distributorId) {
    const err = new Error('حساب الموزع غير مربوط بسجل موزع');
    err.code = 'DISTRIBUTOR_NOT_LINKED';
    err.status = 403;
    throw err;
  }
  const distSnap = await db.collection(DISTRIBUTORS_COL).doc(distributorId).get();
  if (!distSnap.exists) {
    const err = new Error('سجل الموزع غير موجود');
    err.code = 'DISTRIBUTOR_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const distributor = distSnap.data() || {};
  const status = String(distributor.status || '').toLowerCase();
  if (status === 'pending') {
    const err = new Error('حساب الموزع بانتظار الموافقة');
    err.code = 'DISTRIBUTOR_PENDING';
    err.status = 403;
    throw err;
  }
  if (status === 'rejected' || distributor.canLogin === false) {
    const err = new Error('حساب الموزع غير مفعّل');
    err.code = 'DISTRIBUTOR_INACTIVE';
    err.status = 403;
    throw err;
  }
  if (status && status !== 'active' && distributor.active !== true) {
    const err = new Error('حساب الموزع غير نشط');
    err.code = 'DISTRIBUTOR_INACTIVE';
    err.status = 403;
    throw err;
  }
  return {
    distributorId,
    userData,
    distributor: { id: distSnap.id, ...distributor },
  };
}

export async function fetchDistributorSchools(db, distributorId, packagesMap) {
  const snap = await db
    .collection(SCHOOLS_COL)
    .where('distributorId', '==', distributorId)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() || {};
    const planId = data.planId || 'basic';
    return {
      id: doc.id,
      name: data.name || doc.id,
      governorate: data.governorate || data.province || data.city || '',
      planId,
      planName: packagesMap.get(planId)?.name || planId,
      status: data.status || '',
      subscriptionStatus: data.subscriptionStatus || '',
      paymentStatus: data.paymentStatus || '',
      distributorLinkedAt: data.distributorLinkedAt || null,
      lastPaymentAt: data.lastPaymentAt || data.lastPaidAt || '',
      distributorCommissionPaused: Boolean(data.distributorCommissionPaused),
      isActive: schoolIsActive(data),
    };
  });
}

export async function fetchDistributorCommissions(db, distributorId, filters = {}) {
  let q = db.collection(COMMISSIONS_COL).where('distributorId', '==', distributorId);
  const snap = await q.get();
  let rows = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));

  const monthKey = String(filters.monthKey || '').trim();
  const status = String(filters.status || '').trim();
  const schoolId = String(filters.schoolId || '').trim();

  if (monthKey) rows = rows.filter((r) => r.monthKey === monthKey);
  if (status) rows = rows.filter((r) => r.status === status);
  if (schoolId) rows = rows.filter((r) => r.schoolId === schoolId);

  rows.sort((a, b) => String(b.monthKey || '').localeCompare(String(a.monthKey || '')));
  return rows;
}

export function buildDistributorStats(commissions, schools, monthKey = currentMonthKey()) {
  const activeSchools = schools.filter((s) => s.isActive && !s.distributorCommissionPaused).length;
  let thisMonthCommission = 0;
  let totalDue = 0;
  let totalPaid = 0;
  let pendingCommissions = 0;

  for (const c of commissions) {
    const amount = Number(c.commissionAmount || 0);
    if (c.monthKey === monthKey) thisMonthCommission += amount;
    if (c.status === 'paid') totalPaid += amount;
    else if (c.status === 'earned' || c.status === 'pending') {
      totalDue += amount;
      if (c.status === 'pending') pendingCommissions += 1;
    }
  }

  return {
    totalSchools: schools.length,
    activeSchools,
    thisMonthCommission,
    totalDue,
    totalPaid,
    pendingCommissions,
  };
}

export function enrichSchoolsWithCommissions(schools, commissions, monthKey = currentMonthKey()) {
  const bySchool = new Map();
  for (const c of commissions) {
    const sid = c.schoolId;
    if (!sid) continue;
    const entry = bySchool.get(sid) || { currentMonth: 0, total: 0 };
    if (c.monthKey === monthKey) entry.currentMonth += Number(c.commissionAmount || 0);
    if (c.status !== 'canceled') entry.total += Number(c.commissionAmount || 0);
    bySchool.set(sid, entry);
  }
  return schools.map((s) => ({
    ...s,
    currentMonthCommission: bySchool.get(s.id)?.currentMonth || 0,
    totalCommissionFromSchool: bySchool.get(s.id)?.total || 0,
  }));
}

export async function loadPackagesMap(db) {
  const snap = await db.collection(PACKAGES_COL).get();
  const map = new Map();
  snap.docs.forEach((doc) => map.set(doc.id, { id: doc.id, ...(doc.data() || {}) }));
  return map;
}

export async function getDistributorDashboardPayload(db, uid) {
  const ctx = await resolveDistributorContext(db, uid);
  const packagesMap = await loadPackagesMap(db);
  const schools = await fetchDistributorSchools(db, ctx.distributorId, packagesMap);
  const commissions = await fetchDistributorCommissions(db, ctx.distributorId);
  const monthKey = currentMonthKey();
  const stats = buildDistributorStats(commissions, schools, monthKey);
  const schoolsEnriched = enrichSchoolsWithCommissions(schools, commissions, monthKey);

  return {
    ok: true,
    distributor: ctx.distributor,
    profile: {
      uid,
      name: ctx.userData.name || ctx.distributor.name,
      email: ctx.userData.email || ctx.distributor.email || '',
      phone: ctx.userData.phone || ctx.userData.phoneNumber || ctx.distributor.phone || '',
      distributorId: ctx.distributorId,
    },
    stats,
    schools: schoolsEnriched,
    commissions,
    monthKey,
  };
}
