// C. Parent <-> student linking integrity (decision D1: links require school-admin approval;
//    decision D2: any e-mail based step requires a verified e-mail).
// The approval workflow does not exist yet, so the tests probe the current direct-write paths that a
// parent can use to link itself without approval. Approval-request specific cases are marked TODO.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { adminDb, clientArrayUnion, clientUpdate, clientSet, clientGet, expectDenied, expectAllowed, readDoc } from '../lib/harness.mjs';
import { seedWorld, as, newcomer } from '../lib/fixtures.mjs';

const unlinkedParent = async (uid, email = `${uid}@x.test`) => {
  await adminDb.doc(`users/${uid}`).set({ uid, email, role: 'parent', schoolId: '', name: uid });
  return uid;
};

describe('C. Parent-student linking', () => {
  beforeEach(() => seedWorld());

  it('[C1.1][C4] unlinked parent cannot add itself to a student of another school', async () => {
    await unlinkedParent('n_c11');
    expectDenied(await clientArrayUnion(newcomer('n_c11', 'n_c11@x.test'), 'students/ST2', 'parentIds', ['n_c11']), 'self-link to ST2');
  });

  it('[C1.2][C4] unlinked parent cannot add itself to a student whose parentEmail is someone else', async () => {
    await unlinkedParent('n_c12');
    expectDenied(await clientArrayUnion(newcomer('n_c12', 'n_c12@x.test'), 'students/ST1b', 'parentIds', ['n_c12']), 'self-link to ST1b');
  });

  it('[C1.3][C4] parent of one child cannot add itself to another child of the same school', async () => {
    expectDenied(await clientArrayUnion(as('parent1'), 'students/ST1b', 'parentIds', ['u_parent1']), 'parent1 self-links to ST1b');
  });

  it('[C2.1][C4][D1] matching verified e-mail is NOT enough: self-link without school approval is denied', async () => {
    await unlinkedParent('n_c21', 'unlinked@s1.test');
    expectDenied(await clientArrayUnion(newcomer('n_c21', 'unlinked@s1.test', { emailVerified: true }), 'students/ST1b', 'parentIds', ['n_c21']), 'verified-email self-link without approval');
  });

  it('[C2.2][C4][D1] parent cannot attach studentIds + schoolId to its own profile without approval', async () => {
    await unlinkedParent('n_c22');
    expectDenied(await clientUpdate(newcomer('n_c22', 'n_c22@x.test'), 'users/n_c22', { role: 'parent', schoolId: 'S2', studentIds: ['ST2'] }), 'parent self-assigns studentIds/schoolId');
  });

  it('[C3.1][C4][D2] parent with an UNVERIFIED e-mail equal to parentEmail cannot self-link', async () => {
    await unlinkedParent('n_c31', 'unlinked@s1.test');
    expectDenied(await clientArrayUnion(newcomer('n_c31', 'unlinked@s1.test', { emailVerified: false }), 'students/ST1b', 'parentIds', ['n_c31']), 'unverified-email self-link');
  });

  it('[C4.1][C3][C4] stored profile e-mail different from the authenticated e-mail cannot be used to link', async () => {
    await adminDb.doc('users/n_c41').set({ uid: 'n_c41', email: 'unlinked@s1.test', role: 'parent', schoolId: '' });
    expectDenied(await clientArrayUnion(newcomer('n_c41', 'n_c41@evil.test'), 'students/ST1b', 'parentIds', ['n_c41']), 'link via spoofed stored e-mail');
  });

  it('[C5.1] repeating an existing link does not create duplicate entries', async () => {
    await clientArrayUnion(as('parent1'), 'students/ST1', 'parentIds', ['u_parent1']);
    const ids = (await readDoc('students/ST1')).parentIds;
    assert.equal(ids.filter((x) => x === 'u_parent1').length, 1, 'parentIds must not contain duplicates');
  });

  it('[C5.2][C4] parent cannot write a parentIds array containing duplicate / padded entries', async () => {
    expectDenied(await clientUpdate(as('parent1'), 'students/ST1', { parentIds: ['u_parent1', 'u_parent1', 'u_parent1'] }), 'duplicate parentIds write');
  });

  it.todo('[C5.3][D1] duplicate approval request for the same parent/student is rejected — NOT TESTABLE: approval-request workflow not implemented yet');

  it('[C6.1][C4] two concurrent unapproved self-links to the same student are both denied and existing links survive', async () => {
    await unlinkedParent('n_c61a');
    await unlinkedParent('n_c61b');
    const [ra, rb] = await Promise.all([
      clientArrayUnion(newcomer('n_c61a', 'n_c61a@x.test'), 'students/ST1', 'parentIds', ['n_c61a']),
      clientArrayUnion(newcomer('n_c61b', 'n_c61b@x.test'), 'students/ST1', 'parentIds', ['n_c61b']),
    ]);
    const ids = (await readDoc('students/ST1')).parentIds;
    assert.ok(ids.includes('u_parent1'), 'the genuine parent link must survive');
    expectDenied(ra, 'concurrent self-link A');
    expectDenied(rb, 'concurrent self-link B');
  });

  it('[C6.2][C4] concurrent full-array overwrites cannot evict the genuine parent', async () => {
    await unlinkedParent('n_c62a');
    await unlinkedParent('n_c62b');
    await Promise.all([
      clientUpdate(newcomer('n_c62a', 'n_c62a@x.test'), 'students/ST1', { parentIds: ['n_c62a'] }),
      clientUpdate(newcomer('n_c62b', 'n_c62b@x.test'), 'students/ST1', { parentIds: ['n_c62b'] }),
    ]);
    const ids = (await readDoc('students/ST1')).parentIds;
    assert.deepEqual(ids, ['u_parent1'], `parentIds must be unchanged, got ${JSON.stringify(ids)}`);
  });

  it.todo('[C6.3][D1] two concurrent approval requests for the same student are serialised — NOT TESTABLE: approval-request workflow not implemented yet');

  it('[C7.1] a denied link attempt that also tampers with schoolId leaves the student untouched', async () => {
    await unlinkedParent('n_c71');
    const before = await readDoc('students/ST2');
    const r = await clientUpdate(newcomer('n_c71', 'n_c71@x.test'), 'students/ST2', { parentIds: ['u_parent2', 'n_c71'], schoolId: 'S1' });
    expectDenied(r, 'link + schoolId tamper');
    assert.deepEqual(await readDoc('students/ST2'), before, 'student document must be unchanged');
  });

  it('[C7.2][C4] a linked parent cannot remove a co-parent from the student', async () => {
    await adminDb.doc('students/ST1').update({ parentIds: ['u_parent1', 'u_coparent'] });
    expectDenied(await clientUpdate(as('parent1'), 'students/ST1', { parentIds: ['u_parent1'] }), 'parent evicts co-parent');
    assert.deepEqual((await readDoc('students/ST1')).parentIds, ['u_parent1', 'u_coparent']);
  });

  it('[C8.1][C4] end-to-end: a stranger cannot obtain a child record + grades of another school', async () => {
    await unlinkedParent('n_c81');
    const t = newcomer('n_c81', 'n_c81@x.test');
    await clientArrayUnion(t, 'students/ST2', 'parentIds', ['n_c81']);
    await clientUpdate(t, 'users/n_c81', { role: 'parent', schoolId: 'S2' });
    expectDenied(await clientGet(t, 'students/ST2'), 'stranger reads ST2 after self-link attempts');
    expectDenied(await clientGet(t, 'grades/G2'), 'stranger reads G2 after self-link attempts');
  });

  // --- Controls -----------------------------------------------------------------------------
  it('[C.C1] CONTROL: school admin can link a parent to a student of its own school', async () => {
    expectAllowed(await clientArrayUnion(as('admin1'), 'students/ST1b', 'parentIds', ['u_parent1']), 'admin links parent');
  });

  it('[C.C2] CONTROL: a linked parent can read its own child and grades', async () => {
    expectAllowed(await clientGet(as('parent1'), 'students/ST1'), 'parent reads own child');
    expectAllowed(await clientGet(as('parent1'), 'grades/G1'), 'parent reads own child grade');
  });

  it('[C.C3] CONTROL: admin of another school cannot link parents to S1 students', async () => {
    expectDenied(await clientArrayUnion(as('admin2'), 'students/ST1b', 'parentIds', ['u_parent2']), 'admin2 links into S1');
  });

  it('[C.C4] CONTROL: parent cannot overwrite the whole student document', async () => {
    expectDenied(await clientSet(as('parent1'), 'students/ST1', { name: 'x', schoolId: 'S1', parentIds: ['u_parent1'] }), 'parent full overwrite');
  });
});
