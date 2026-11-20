// B. Identity spoofing and access to other accounts.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { adminDb, clientCreate, clientUpdate, clientDelete, clientGet, expectDenied, expectAllowed, readDoc } from '../lib/harness.mjs';
import { seedWorld, as, newcomer } from '../lib/fixtures.mjs';

/** A self-created parent profile whose stored e-mail is chosen by the attacker. */
async function spoofProfile(uid, tokenEmail, storedEmail) {
  const t = newcomer(uid, tokenEmail);
  const r = await clientCreate(t, `users/${uid}`, { uid, email: storedEmail, role: 'parent', schoolId: '' });
  return { t, created: r.status === 200 };
}

describe('B. Identity and account access', () => {
  beforeEach(async () => {
    await seedWorld();
    await adminDb.doc('users/prov_teacher').set({ email: 'newteacher@s1.test', role: 'teacher', schoolId: 'S1', name: 'Pre-provisioned Teacher' });
  });

  // --- B1: someone else's UID --------------------------------------------------------------
  it('[B1.1] a user cannot create a users document under a UID that is not its own', async () => {
    const t = newcomer('n_b11', 'n_b11@x.test');
    expectDenied(await clientCreate(t, 'users/some_other_uid', { uid: 'some_other_uid', email: 'n_b11@x.test', role: 'parent', schoolId: '' }), 'create users/<other uid>');
  });

  it('[B1.2] a user cannot create a users document that claims another UID inside its own path', async () => {
    const t = newcomer('n_b12', 'n_b12@x.test');
    const r = await clientCreate(t, 'users/n_b12', { uid: 'u_super', email: 'n_b12@x.test', role: 'parent', schoolId: '' });
    expectDenied(r, 'own path with uid field = u_super');
  });

  // --- B2: editing / deleting another account ----------------------------------------------
  it('[B2.1] parent cannot edit another parent profile', async () => {
    expectDenied(await clientUpdate(as('parent1'), 'users/u_parent2', { name: 'hijacked' }), 'parent1 edits parent2');
  });
  it('[B2.2] parent cannot delete another parent profile', async () => {
    expectDenied(await clientDelete(as('parent1'), 'users/u_parent2'), 'parent1 deletes parent2');
  });
  it('[B2.3] school admin cannot edit the admin of another school', async () => {
    expectDenied(await clientUpdate(as('admin1'), 'users/u_admin2', { name: 'hijacked' }), 'admin1 edits admin2');
  });
  it('[B2.4] school admin cannot delete a co-admin of its own school', async () => {
    expectDenied(await clientDelete(as('admin1'), 'users/u_admin1b'), 'admin1 deletes co-admin');
  });

  // --- B3: e-mail based access without proof of ownership -----------------------------------
  it('[B3.1][C3] a stored (self-written) e-mail must not allow deleting the super admin profile', async () => {
    const { t } = await spoofProfile('n_b31', 'n_b31@evil.test', 'super@platform.test');
    expectDenied(await clientDelete(t, 'users/u_super'), 'delete super admin doc via spoofed e-mail');
  });

  it('[B3.2][C3] a stored (self-written) e-mail must not allow reading the super admin profile', async () => {
    const { t } = await spoofProfile('n_b32', 'n_b32@evil.test', 'super@platform.test');
    expectDenied(await clientGet(t, 'users/u_super'), 'read super admin doc via spoofed e-mail');
  });

  it('[B3.3][C3] a stored (self-written) e-mail must not expose another person registration request', async () => {
    const { t } = await spoofProfile('n_b33', 'n_b33@evil.test', 'owner@pending.test');
    expectDenied(await clientGet(t, 'registrations/R_PENDING'), 'read pending registration via spoofed e-mail');
  });

  it('[B3.4][C3] a stored (self-written) e-mail must not allow editing another person pending registration', async () => {
    const { t } = await spoofProfile('n_b34', 'n_b34@evil.test', 'owner@pending.test');
    expectDenied(await clientUpdate(t, 'registrations/R_PENDING', { schoolName: 'tampered' }), 'edit pending registration via spoofed e-mail');
  });

  it('[B3.5][C3][D2] an UNVERIFIED token e-mail must not allow claiming (deleting) a pre-provisioned profile', async () => {
    const t = newcomer('n_b35', 'newteacher@s1.test', { emailVerified: false });
    expectDenied(await clientDelete(t, 'users/prov_teacher'), 'unverified e-mail deletes provisioned doc');
  });

  it('[B3.6][C1][D2] an UNVERIFIED token e-mail must not allow copying a pre-provisioned teacher role', async () => {
    const t = newcomer('n_b36', 'newteacher@s1.test', { emailVerified: false });
    expectDenied(await clientCreate(t, 'users/n_b36', { uid: 'n_b36', email: 'newteacher@s1.test', role: 'teacher', schoolId: 'S1' }), 'unverified e-mail takes over provisioned teacher role');
  });

  it('[B3.C1] CONTROL: the verified owner of a pre-provisioned e-mail can claim (delete) the provisioned document', async () => {
    const t = newcomer('n_b3c', 'newteacher@s1.test', { emailVerified: true });
    expectAllowed(await clientDelete(t, 'users/prov_teacher'), 'verified owner claims provisioned doc');
  });

  // --- B4: case and whitespace --------------------------------------------------------------
  it('[B4.1] e-mail comparison: an upper-case variant of the super admin e-mail grants nothing', async () => {
    const { t } = await spoofProfile('n_b41', 'n_b41@evil.test', 'SUPER@PLATFORM.TEST');
    expectDenied(await clientDelete(t, 'users/u_super'), 'case variant deletes super admin doc');
  });

  it('[B4.2] e-mail comparison: a whitespace-padded variant of the super admin e-mail grants nothing', async () => {
    const { t } = await spoofProfile('n_b42', 'n_b42@evil.test', ' super@platform.test ');
    expectDenied(await clientDelete(t, 'users/u_super'), 'padded variant deletes super admin doc');
    assert.ok(await readDoc('users/u_super'));
  });

  it('[B4.3][FUNCTIONAL] school with a mixed-case adminEmail is still readable by its verified admin (rules lower-case only the token side)', async () => {
    await adminDb.doc('schools/S3').set({ name: 'Mixed Case School', status: 'pending_subscription', adminEmail: 'Owner@Mixed.test' });
    const t = newcomer('n_b43', 'owner@mixed.test');
    expectAllowed(await clientGet(t, 'schools/S3'), 'verified admin reads school with mixed-case adminEmail');
  });
});
