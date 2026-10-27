/**
 * Seed the Firebase emulators with one school and an account for every role.
 * Run with the emulators up:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *   npx tsx scripts/e2e/seed-emulator.ts
 */
import admin from 'firebase-admin';
import { SCHOOL_FEATURES } from '../../src/lib/featureRegistry';
import firebaseConfig from '../../firebase-applet-config.json';

export const E2E_PASSWORD = 'Test@12345';
const PLATFORM_PERMISSIONS = [
  'manage_schools', 'manage_packages', 'manage_subscriptions', 'view_requests',
  'manage_distributors', 'manage_users', 'manage_system', 'system_settings', 'view_backups',
];
export const E2E_ACCOUNTS = {
  superadmin: { uid: 'u_superadmin', email: 'super@e2e.test', role: 'superadmin', name: 'مدير النظام' },
  platform_assistant: { uid: 'u_passist', email: 'passist@e2e.test', role: 'platform_assistant', name: 'مساعد المنصة' },
  admin: { uid: 'u_admin', email: 'admin@e2e.test', role: 'admin', name: 'مدير المدرسة', schoolId: 'S1' },
  school_assistant: { uid: 'u_sassist', email: 'sassist@e2e.test', role: 'school_assistant', name: 'مساعد المدرسة', schoolId: 'S1' },
  staff: { uid: 'u_staff', email: 'staff@e2e.test', role: 'staff', name: 'موظف', schoolId: 'S1' },
  teacher: { uid: 'u_teacher', email: 'teacher@e2e.test', role: 'teacher', name: 'أستاذ أحمد', schoolId: 'S1' },
  parent: { uid: 'u_parent', email: 'parent@e2e.test', role: 'parent', name: 'ولي الأمر', schoolId: 'S1' },
  guard: { uid: 'u_guard', email: 'guard@e2e.test', role: 'guard', name: 'الحارس', schoolId: 'S1' },
  distributor: { uid: 'u_dist', email: 'dist@e2e.test', role: 'distributor', name: 'موزع', distributorId: 'D1' },
} as const;

async function main() {
  const projectId = firebaseConfig.projectId;
  admin.initializeApp({ projectId });
  const auth = admin.auth();
  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const future = new Date(Date.now() + 365 * 86400_000).toISOString();

  const allPermissions: Record<string, boolean> = {};
  SCHOOL_FEATURES.forEach((f) => { allPermissions[f.key] = true; });
  // Granular staff / school-assistant permissions (feature keys + staff-only ids).
  const staffPermissions = Array.from(new Set([
    ...SCHOOL_FEATURES.map((f) => f.key),
    'homework', 'grades', 'behavior', 'reports', 'advanced_reports', 'schedules', 'id_cards', 'market', 'dismissal',
  ]));

  await db.doc('packages/pro').set({
    name: 'Professional', price: 250000, priceMonthly: 250000, priceYearly: 2500000,
    maxStudents: 1000, durationDays: 365, isPopular: true, showInRegistration: true,
    features: [], permissions: allPermissions,
  });
  await db.doc('schools/S1').set({
    name: 'مدرسة الاختبار', address: 'بغداد', status: 'active', subscriptionStatus: 'active',
    paymentStatus: 'paid', planId: 'pro', subscriptionExpiresAt: future, ownerUid: 'u_admin',
    adminEmail: E2E_ACCOUNTS.admin.email, adminName: 'مدير المدرسة', notificationsEnabled: true,
    showSubscriptionTimer: true, createdAt: now,
  });
  await db.doc('classes/C1').set({ name: 'الصف الأول - أ', schoolId: 'S1', createdAt: now });
  await db.doc('classes/C2').set({ name: 'الصف الثاني - ب', schoolId: 'S1', createdAt: now });
  await db.doc('subjects/SUB1').set({ name: 'الرياضيات', schoolId: 'S1', classId: 'C1', createdAt: now });

  const students = [
    { id: 'ST1', name: 'علي حسن', classId: 'C1', reg: '1001' },
    { id: 'ST2', name: 'زينب كريم', classId: 'C1', reg: '1002' },
    { id: 'ST3', name: 'محمد جاسم', classId: 'C2', reg: '1003' },
  ];
  for (const s of students) {
    await db.doc(`students/${s.id}`).set({
      name: s.name, schoolId: 'S1', classId: s.classId, className: s.classId === 'C1' ? 'الصف الأول - أ' : 'الصف الثاني - ب',
      registrationNumber: s.reg, parentIds: s.id === 'ST3' ? [] : ['u_parent'],
      parentEmail: s.id === 'ST3' ? '' : E2E_ACCOUNTS.parent.email, parentPhone: '07700000000',
      tuitionBalance: 500000, totalTuition: 1000000, paidAmount: 500000, status: 'active', createdAt: now,
    });
  }
  await db.doc('installments/I1').set({
    schoolId: 'S1', studentId: 'ST1', amount: 250000, dueDate: new Date(Date.now() - 5 * 86400_000).toISOString(),
    status: 'unpaid', createdAt: now,
  });

  await db.doc('distributors/D1').set({
    name: 'موزع الاختبار', phone: '07711111111', email: E2E_ACCOUNTS.distributor.email, governorate: 'بغداد',
    status: 'active', active: true, canLogin: true, uid: 'u_dist', couponCode: 'E2E10',
    commissionPercent: 10, discountPercent: 10, createdAt: now,
  });

  for (const acc of Object.values(E2E_ACCOUNTS)) {
    try { await auth.deleteUser(acc.uid); } catch { /* not there yet */ }
    await auth.createUser({ uid: acc.uid, email: acc.email, password: E2E_PASSWORD, displayName: acc.name, emailVerified: true });
    const schoolId = 'schoolId' in acc ? acc.schoolId : '';
    await auth.setCustomUserClaims(acc.uid, {
      role: acc.role,
      ...(schoolId ? { schoolId } : {}),
      p: allPermissions,
    });
    await db.doc(`users/${acc.uid}`).set({
      uid: acc.uid, email: acc.email, name: acc.name, role: acc.role, schoolId,
      status: 'active', subscriptionStatus: 'active', language: 'ar', createdAt: now,
      ...(acc.role === 'teacher' ? {
        subject: 'الرياضيات', assignedClassId: 'C1', assignedClassName: 'الصف الأول - أ',
        assignedClassIds: ['C1', 'C2'], assignedClassNames: 'الصف الأول - أ، الصف الثاني - ب',
      } : {}),
      ...(acc.role === 'platform_assistant' ? { assistantType: 'platform', permissions: PLATFORM_PERMISSIONS } : {}),
      ...(acc.role === 'school_assistant' ? { assistantType: 'school', permissions: staffPermissions } : {}),
      ...(acc.role === 'staff' ? { permissions: staffPermissions } : {}),
      ...('distributorId' in acc ? { distributorId: acc.distributorId } : {}),
      ...(acc.role === 'parent' ? { phone: '07700000000', studentIds: ['ST1', 'ST2'] } : {}),
    });
  }
  await db.doc('users/metadata').set({ initialized: true });
  console.log('SEED_OK', Object.keys(E2E_ACCOUNTS).length, 'accounts');
  process.exit(0);
}

main().catch((e) => { console.error('SEED_FAIL', e); process.exit(1); });
