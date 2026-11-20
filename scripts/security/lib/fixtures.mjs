// Synthetic test world. Every name, e-mail and value below is fictitious and exists only in the
// local emulator. Nothing here mirrors production data.
import { adminDb, adminAuth, idToken, resetEmulators } from './harness.mjs';

export const SYNTHETIC_PASSWORD = 'Synthetic-Only-P@ss-0000';

export const USERS = {
  super: { uid: 'u_super', email: 'super@platform.test', role: 'superadmin', schoolId: '' },
  admin1: { uid: 'u_admin1', email: 'admin1@s1.test', role: 'admin', schoolId: 'S1' },
  admin1b: { uid: 'u_admin1b', email: 'coadmin@s1.test', role: 'admin', schoolId: 'S1' },
  admin2: { uid: 'u_admin2', email: 'admin2@s2.test', role: 'admin', schoolId: 'S2' },
  sassist1: { uid: 'u_sassist1', email: 'sassist1@s1.test', role: 'school_assistant', schoolId: 'S1' },
  staff1: { uid: 'u_staff1', email: 'staff1@s1.test', role: 'staff', schoolId: 'S1', permissions: ['students'] },
  teacher1: { uid: 'u_teacher1', email: 'teacher1@s1.test', role: 'teacher', schoolId: 'S1', assignedClassIds: ['C1'] },
  guard1: { uid: 'u_guard1', email: 'guard1@s1.test', role: 'guard', schoolId: 'S1' },
  parent1: { uid: 'u_parent1', email: 'parent1@s1.test', role: 'parent', schoolId: 'S1', studentIds: ['ST1'] },
  parent2: { uid: 'u_parent2', email: 'parent2@s2.test', role: 'parent', schoolId: 'S2', studentIds: ['ST2'] },
};

/** Token for a seeded persona (verified e-mail, no custom claims unless given). */
export const as = (key, { emailVerified = true, claims = {}, email } = {}) =>
  idToken({ uid: USERS[key].uid, email: email ?? USERS[key].email, emailVerified, claims });

/** Token for a brand-new account that has no Firestore profile yet. */
export const newcomer = (uid, email, { emailVerified = true, claims = {} } = {}) => idToken({ uid, email, emailVerified, claims });

/**
 * Reset both emulators and seed the standard world.
 * @param {{metadata?: boolean}} opts metadata=false simulates a project without users/metadata.
 */
export async function seedWorld({ metadata = true } = {}) {
  await resetEmulators();
  const b = adminDb.batch();
  if (metadata) b.set(adminDb.doc('users/metadata'), { initialized: true });
  b.set(adminDb.doc('packages/basic'), { name: 'basic', maxStudents: 500, permissions: ['students', 'attendance'] });
  b.set(adminDb.doc('schools/S1'), { name: 'Synthetic School One', status: 'active', subscriptionStatus: 'active', adminEmail: 'admin1@s1.test', ownerUid: 'u_admin1', planId: 'basic', studentCount: 2 });
  b.set(adminDb.doc('schools/S2'), { name: 'Synthetic School Two', status: 'active', subscriptionStatus: 'active', adminEmail: 'admin2@s2.test', ownerUid: 'u_admin2', planId: 'basic', studentCount: 1 });
  b.set(adminDb.doc('schools/S1/settings/general'), { theme: 'x' });
  b.set(adminDb.doc('schools/S2/settings/general'), { theme: 'y' });
  b.set(adminDb.doc('classes/C1'), { schoolId: 'S1', name: 'Class 1A' });
  b.set(adminDb.doc('classes/C1b'), { schoolId: 'S1', name: 'Class 1B' });
  b.set(adminDb.doc('classes/C2'), { schoolId: 'S2', name: 'Class 2A' });
  b.set(adminDb.doc('students/ST1'), { name: 'Synthetic Child A', schoolId: 'S1', classId: 'C1', registrationNumber: '1001', parentIds: ['u_parent1'], parentEmail: 'parent1@s1.test', dob: '2016-01-01' });
  b.set(adminDb.doc('students/ST1b'), { name: 'Synthetic Child B', schoolId: 'S1', classId: 'C1b', registrationNumber: '1002', parentIds: [], parentEmail: 'unlinked@s1.test', dob: '2016-02-02' });
  b.set(adminDb.doc('students/ST2'), { name: 'Synthetic Child C', schoolId: 'S2', classId: 'C2', registrationNumber: '2001', parentIds: ['u_parent2'], parentEmail: 'parent2@s2.test', dob: '2015-03-03' });
  b.set(adminDb.doc('grades/G1'), { studentId: 'ST1', schoolId: 'S1', classId: 'C1', score: 'A', parentIds: ['u_parent1'] });
  b.set(adminDb.doc('grades/G2'), { studentId: 'ST2', schoolId: 'S2', classId: 'C2', score: 'B', parentIds: ['u_parent2'] });
  b.set(adminDb.doc('system_config/main'), { maintenance: false });
  b.set(adminDb.doc('registrations/R_PENDING'), {
    email: 'owner@pending.test', status: 'pending', schoolName: 'Pending School',
    customerInfo: { email: 'owner@pending.test', password: SYNTHETIC_PASSWORD },
  });
  for (const u of Object.values(USERS)) {
    b.set(adminDb.doc(`users/${u.uid}`), { name: u.uid, status: 'active', ...u });
  }
  await b.commit();
}

/** Create Auth-emulator accounts (needed only by the server tests that call verifyIdToken/getUser). */
export async function seedAuthAccounts(keys) {
  for (const k of keys) {
    const u = USERS[k];
    await adminAuth.createUser({ uid: u.uid, email: u.email, password: SYNTHETIC_PASSWORD, emailVerified: true });
  }
}
