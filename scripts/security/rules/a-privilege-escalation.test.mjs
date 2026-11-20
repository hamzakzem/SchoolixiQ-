// A. Privilege escalation through users/{uid} and users/metadata.
// Every test states the SECURE expectation. A failing test is a proven weakness in firestore.rules.
import { describe, it, beforeEach } from 'node:test';
import { adminDb, clientCreate, clientUpdate, clientSet, clientDelete, clientGet, expectDenied, expectAllowed, readDoc } from '../lib/harness.mjs';
import { seedWorld, as, newcomer } from '../lib/fixtures.mjs';
import assert from 'node:assert/strict';

describe('A. Privilege escalation', () => {
  beforeEach(() => seedWorld());

  // --- A1 / A9: superadmin bootstrap via users/metadata ------------------------------------
  it('[A1.1] new user cannot self-create role=superadmin while users/metadata exists', async () => {
    const t = newcomer('n_a11', 'n_a11@x.test');
    expectDenied(await clientCreate(t, 'users/n_a11', { uid: 'n_a11', email: 'n_a11@x.test', role: 'superadmin', schoolId: '' }), 'self-create superadmin');
  });

  it('[A1.2][H4] new user cannot self-create role=superadmin even when users/metadata is missing', async () => {
    await adminDb.doc('users/metadata').delete();
    const t = newcomer('n_a12', 'n_a12@x.test');
    expectDenied(await clientCreate(t, 'users/n_a12', { uid: 'n_a12', email: 'n_a12@x.test', role: 'superadmin', schoolId: '' }), 'self-create superadmin without metadata (legacy bootstrap path)');
  });

  it('[A9.1] users/metadata blocks the legacy bootstrap path by existence alone (initialized=false still blocks)', async () => {
    await adminDb.doc('users/metadata').set({ initialized: false });
    const t = newcomer('n_a91', 'n_a91@x.test');
    expectDenied(await clientCreate(t, 'users/n_a91', { uid: 'n_a91', email: 'n_a91@x.test', role: 'superadmin', schoolId: '' }), 'self-create superadmin with metadata {initialized:false}');
  });

  // --- A2: self-created privileged roles ---------------------------------------------------
  it('[A2.1][C1] new user cannot self-create role=admin for an existing school it does not own', async () => {
    const t = newcomer('n_a21', 'n_a21@x.test');
    expectDenied(await clientCreate(t, 'users/n_a21', { uid: 'n_a21', email: 'n_a21@x.test', role: 'admin', schoolId: 'S2' }), 'self-create admin of S2');
  });

  it('[A2.2][C1][D2] self-create role=admin for the school whose adminEmail matches is denied when the e-mail is NOT verified', async () => {
    const t = newcomer('n_a22', 'admin2@s2.test', { emailVerified: false });
    expectDenied(await clientCreate(t, 'users/n_a22', { uid: 'n_a22', email: 'admin2@s2.test', role: 'admin', schoolId: 'S2' }), 'self-create admin with unverified e-mail');
  });

  for (const role of ['teacher', 'staff', 'guard', 'assistant', 'school_assistant']) {
    it(`[A2.3][C1] new user cannot self-create role=${role} inside a school`, async () => {
      const uid = `n_a23_${role}`;
      const t = newcomer(uid, `${uid}@x.test`);
      expectDenied(await clientCreate(t, `users/${uid}`, { uid, email: `${uid}@x.test`, role, schoolId: 'S1' }), `self-create ${role} of S1`);
    });
  }

  it('[A2.C1] CONTROL: new user can self-create a plain parent profile with no school', async () => {
    const t = newcomer('n_a2c1', 'n_a2c1@x.test');
    expectAllowed(await clientCreate(t, 'users/n_a2c1', { uid: 'n_a2c1', email: 'n_a2c1@x.test', role: 'parent', schoolId: '' }), 'self-create parent');
  });

  it('[A2.C2] CONTROL: new school admin can self-create an admin draft without a school', async () => {
    const t = newcomer('n_a2c2', 'n_a2c2@x.test');
    expectAllowed(await clientCreate(t, 'users/n_a2c2', { uid: 'n_a2c2', email: 'n_a2c2@x.test', role: 'admin', name: 'Draft Admin' }), 'self-create admin draft');
  });

  // --- A3: changing one's own role -----------------------------------------------------------
  it('[A3.1] parent cannot change its own role to superadmin', async () => {
    expectDenied(await clientUpdate(as('parent1'), 'users/u_parent1', { role: 'superadmin' }), 'parent self-promotion');
  });

  it('[A3.2] teacher cannot change its own role to superadmin', async () => {
    expectDenied(await clientUpdate(as('teacher1'), 'users/u_teacher1', { role: 'superadmin' }), 'teacher self-promotion');
  });

  // --- A4: changing schoolId ---------------------------------------------------------------
  it('[A4.1] linked parent cannot move its own profile to another school', async () => {
    expectDenied(await clientUpdate(as('parent1'), 'users/u_parent1', { schoolId: 'S2', role: 'parent' }), 'parent S1 -> S2');
  });

  it('[A4.2][C4] parent without a school cannot attach its profile to an arbitrary school', async () => {
    await adminDb.doc('users/n_a42').set({ uid: 'n_a42', email: 'n_a42@x.test', role: 'parent', schoolId: '' });
    const t = newcomer('n_a42', 'n_a42@x.test');
    expectDenied(await clientUpdate(t, 'users/n_a42', { schoolId: 'S2', role: 'parent' }), 'unlinked parent sets schoolId=S2');
  });

  it('[A4.3][H1] school admin cannot move its own profile to another school', async () => {
    expectDenied(await clientUpdate(as('admin1'), 'users/u_admin1', { schoolId: 'S2' }), 'admin S1 -> S2');
  });

  // --- A5: permissions ---------------------------------------------------------------------
  it('[A5.1] parent cannot grant itself permissions', async () => {
    expectDenied(await clientUpdate(as('parent1'), 'users/u_parent1', { permissions: ['manage_users'] }), 'parent self-grants permissions');
  });

  it('[A5.2][C1] new user cannot self-create a profile that already carries permissions', async () => {
    const t = newcomer('n_a52', 'n_a52@x.test');
    expectDenied(await clientCreate(t, 'users/n_a52', { uid: 'n_a52', email: 'n_a52@x.test', role: 'parent', schoolId: '', permissions: ['manage_users', 'view_requests'] }), 'self-create with permissions');
  });

  it('[A5.3][C2] school assistant cannot grant itself permissions', async () => {
    expectDenied(await clientUpdate(as('sassist1'), 'users/u_sassist1', { permissions: ['payroll', 'tuition', 'settings'] }), 'assistant self-grants permissions');
  });

  it('[A5.4] staff member cannot grant itself extra permissions', async () => {
    expectDenied(await clientUpdate(as('staff1'), 'users/u_staff1', { permissions: ['students', 'payroll'] }), 'staff self-grants permissions');
  });

  // --- A6: assistant promotion -------------------------------------------------------------
  it('[A6.1][C2] school assistant cannot promote itself to school admin', async () => {
    expectDenied(await clientUpdate(as('sassist1'), 'users/u_sassist1', { role: 'admin' }), 'assistant -> admin');
  });

  it('[A6.2][C2] school assistant cannot promote itself to superadmin', async () => {
    expectDenied(await clientUpdate(as('sassist1'), 'users/u_sassist1', { role: 'superadmin' }), 'assistant -> superadmin');
  });

  it('[A6.3][H2] new user cannot self-create a legacy "assistant" with no school (treated as platform assistant)', async () => {
    const t = newcomer('n_a63', 'n_a63@x.test');
    expectDenied(await clientCreate(t, 'users/n_a63', { uid: 'n_a63', email: 'n_a63@x.test', role: 'assistant', schoolId: '' }), 'self-create schoolless assistant');
  });

  // --- A7: admin -> superadmin -------------------------------------------------------------
  it('[A7.1][C2] school admin cannot promote itself to superadmin', async () => {
    expectDenied(await clientUpdate(as('admin1'), 'users/u_admin1', { role: 'superadmin' }), 'admin -> superadmin (self)');
  });

  it('[A7.2][C2] school admin cannot promote a teacher of its school to superadmin', async () => {
    expectDenied(await clientUpdate(as('admin1'), 'users/u_teacher1', { role: 'superadmin' }), 'admin promotes teacher -> superadmin');
  });

  it('[A7.3][C2] school admin cannot promote a teacher of its school to platform_assistant', async () => {
    expectDenied(await clientUpdate(as('admin1'), 'users/u_teacher1', { role: 'platform_assistant', schoolId: '' }), 'admin promotes teacher -> platform_assistant');
  });

  it('[A7.4][C7] school admin cannot pre-provision a users document with role=superadmin', async () => {
    expectDenied(await clientCreate(as('admin1'), 'users/prov_evil', { email: 'second-account@x.test', role: 'superadmin', schoolId: 'S1' }), 'admin pre-provisions superadmin doc');
  });

  it('[A7.5][C1+C2] end-to-end: anonymous sign-up cannot reach super-admin-only data', async () => {
    const t = newcomer('n_a75', 'n_a75@x.test');
    const step1 = await clientCreate(t, 'users/n_a75', { uid: 'n_a75', email: 'n_a75@x.test', role: 'admin', schoolId: 'S1' });
    const step2 = step1.status === 200 ? await clientUpdate(t, 'users/n_a75', { role: 'superadmin' }) : step1;
    const step3 = await clientGet(t, 'system_config/main');
    expectDenied(step3, `read system_config after chain (create=${step1.status}, promote=${step2.status})`);
  });

  it('[A7.C1] CONTROL: school admin can change a teacher of its school to staff', async () => {
    expectAllowed(await clientUpdate(as('admin1'), 'users/u_teacher1', { role: 'staff' }), 'admin edits staff role');
  });

  it('[A7.C2] CONTROL: school admin can pre-provision a teacher document for its school', async () => {
    expectAllowed(await clientCreate(as('admin1'), 'users/prov_teacher', { email: 'newteacher@s1.test', role: 'teacher', schoolId: 'S1', name: 'New Teacher' }), 'admin pre-provisions teacher');
  });

  // --- A8: users/metadata integrity --------------------------------------------------------
  for (const who of ['parent1', 'teacher1', 'admin1', 'sassist1']) {
    it(`[A8.1] ${who} cannot delete users/metadata`, async () => {
      expectDenied(await clientDelete(as(who), 'users/metadata'), `${who} deletes metadata`);
      assert.ok(await readDoc('users/metadata'), 'metadata must still exist');
    });
    it(`[A8.2] ${who} cannot overwrite users/metadata`, async () => {
      expectDenied(await clientSet(as(who), 'users/metadata', { initialized: false }), `${who} overwrites metadata`);
    });
  }

  it('[A8.3][H4] a self-escalated account cannot delete users/metadata (re-opening the bootstrap path)', async () => {
    const t = newcomer('n_a83', 'n_a83@x.test');
    await clientCreate(t, 'users/n_a83', { uid: 'n_a83', email: 'n_a83@x.test', role: 'admin', schoolId: 'S1' });
    await clientUpdate(t, 'users/n_a83', { role: 'superadmin' });
    expectDenied(await clientDelete(t, 'users/metadata'), 'self-escalated account deletes metadata');
  });

  it('[A8.4][H4] hardening: even a genuine superadmin cannot delete users/metadata', async () => {
    expectDenied(await clientDelete(as('super'), 'users/metadata'), 'superadmin deletes metadata');
  });
});
