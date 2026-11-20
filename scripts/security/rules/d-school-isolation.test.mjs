// D. School isolation (complements scripts/e2e/rules-school-isolation.mjs).
import { describe, it, beforeEach } from 'node:test';
import { adminDb, clientCreate, clientUpdate, clientGet, clientQuery, expectDenied, expectAllowed } from '../lib/harness.mjs';
import { seedWorld, as, newcomer } from '../lib/fixtures.mjs';

describe('D. School isolation', () => {
  beforeEach(() => seedWorld());

  // D1 — admin of S1 vs data of S2
  for (const [path, label] of [['schools/S2', 'school doc'], ['schools/S2/settings/general', 'school settings'], ['students/ST2', 'student'], ['grades/G2', 'grade'], ['users/u_parent2', 'parent profile']]) {
    it(`[D1.1] admin of S1 cannot read ${label} of S2`, async () => {
      expectDenied(await clientGet(as('admin1'), path), `admin1 reads ${path}`);
    });
  }
  it('[D1.2] admin of S1 cannot list students of S2', async () => {
    expectDenied(await clientQuery(as('admin1'), 'students', { where: [['schoolId', 'EQUAL', 'S2']] }), 'admin1 lists S2 students');
  });

  // D2 — teacher scope
  it('[D2.1] teacher cannot read a student of an unassigned class in its own school', async () => {
    expectDenied(await clientGet(as('teacher1'), 'students/ST1b'), 'teacher1 reads ST1b (class C1b)');
  });
  it('[D2.2] teacher cannot read a student of another school', async () => {
    expectDenied(await clientGet(as('teacher1'), 'students/ST2'), 'teacher1 reads ST2');
  });
  it('[D2.3] teacher cannot read a class of another school', async () => {
    expectDenied(await clientGet(as('teacher1'), 'classes/C2'), 'teacher1 reads C2');
  });
  it('[D2.C] CONTROL: teacher can read a student of its assigned class', async () => {
    expectAllowed(await clientGet(as('teacher1'), 'students/ST1'), 'teacher1 reads ST1');
  });

  // D3 — assistants
  it('[D3.1] school assistant of S1 cannot read student / school of S2', async () => {
    expectDenied(await clientGet(as('sassist1'), 'students/ST2'), 'sassist1 reads ST2');
    expectDenied(await clientGet(as('sassist1'), 'schools/S2'), 'sassist1 reads S2');
  });
  it('[D3.2][H2] a legacy "assistant" profile without a school is not a platform assistant (cannot read other schools)', async () => {
    await adminDb.doc('users/n_d32').set({ uid: 'n_d32', email: 'n_d32@x.test', role: 'assistant', schoolId: '' });
    expectDenied(await clientGet(newcomer('n_d32', 'n_d32@x.test'), 'schools/S2'), 'schoolless assistant reads S2');
  });
  it('[D3.3][H2][H7] a legacy schoolless "assistant" with self-written permissions cannot read registration requests', async () => {
    await adminDb.doc('users/n_d33').set({ uid: 'n_d33', email: 'n_d33@x.test', role: 'assistant', schoolId: '', permissions: ['view_requests'] });
    expectDenied(await clientGet(newcomer('n_d33', 'n_d33@x.test'), 'registrations/R_PENDING'), 'schoolless assistant reads registrations');
  });

  // D4 — parents
  it('[D4.1] parent cannot read an unlinked student of its own school', async () => {
    expectDenied(await clientGet(as('parent1'), 'students/ST1b'), 'parent1 reads ST1b');
  });
  it('[D4.2] parent cannot read a student / grade of another school', async () => {
    expectDenied(await clientGet(as('parent1'), 'students/ST2'), 'parent1 reads ST2');
    expectDenied(await clientGet(as('parent1'), 'grades/G2'), 'parent1 reads G2');
  });
  it('[D4.3][H3] parent cannot look up a student of another school by guessing its registration number', async () => {
    const r = await clientQuery(as('parent1'), 'students', { where: [['registrationNumber', 'EQUAL', '2001']], limit: 1 });
    const leaked = Array.isArray(r.docs) && r.docs.length > 0 ? ` (leaked ${r.docs.map((d) => `${d.id}@${d.schoolId}`).join(',')})` : '';
    expectDenied(r, `registration-number lookup across schools${leaked}`);
  });

  // D5 — tampering with schoolId in the request
  it('[D5.1] admin of S1 cannot create an attendance record for S2', async () => {
    expectDenied(await clientCreate(as('admin1'), 'attendance/A_x', { schoolId: 'S2', studentId: 'ST2', status: 'present' }), 'admin1 writes S2 attendance');
  });
  it('[D5.2] admin of S1 cannot pull a student of S2 into S1 by rewriting schoolId', async () => {
    expectDenied(await clientUpdate(as('admin1'), 'students/ST2', { schoolId: 'S1' }), 'admin1 rewrites ST2.schoolId');
  });
  it('[D5.3] admin of S1 cannot create a student inside S2', async () => {
    expectDenied(await clientCreate(as('admin1'), 'students/ST_new', { schoolId: 'S2', name: 'x', classId: 'C2', registrationNumber: '9999' }), 'admin1 creates student in S2');
  });
  it('[D5.4][C1] a self-written schoolId on a self-created profile grants no access to that school', async () => {
    const t = newcomer('n_d54', 'n_d54@x.test');
    await clientCreate(t, 'users/n_d54', { uid: 'n_d54', email: 'n_d54@x.test', role: 'admin', schoolId: 'S2' });
    expectDenied(await clientGet(t, 'students/ST2'), 'forged admin of S2 reads ST2');
  });
});
