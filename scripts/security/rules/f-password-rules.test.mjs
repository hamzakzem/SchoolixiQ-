// F (rules side). Plaintext passwords must not be accepted into Firestore by client writes.
import { describe, it, beforeEach } from 'node:test';
import { clientCreate, expectDenied, expectAllowed } from '../lib/harness.mjs';
import { seedWorld, as, newcomer } from '../lib/fixtures.mjs';

const synthetic = 'Synthetic-Only-Not-Real-1!';

describe('F. Password storage (Firestore rules)', () => {
  beforeEach(() => seedWorld());

  it('[F1.1][H7] an anonymous registration request carrying customerInfo.password is rejected', async () => {
    expectDenied(await clientCreate(null, 'registrations/R_F11', { email: 'f11@x.test', status: 'pending', customerInfo: { email: 'f11@x.test', password: synthetic } }), 'anonymous registration with password');
  });

  it('[F1.2][H7] a signed-in registration request carrying password / adminPassword is rejected', async () => {
    const t = newcomer('n_f12', 'n_f12@x.test');
    expectDenied(await clientCreate(t, 'registrations/R_F12', { uid: 'n_f12', email: 'n_f12@x.test', status: 'pending', password: synthetic, adminPassword: synthetic }), 'registration with password fields');
  });

  it('[F1.3][H7] a school admin cannot store a parent password on a student document', async () => {
    expectDenied(await clientCreate(as('admin1'), 'students/ST_F13', { schoolId: 'S1', name: 'x', classId: 'C1', registrationNumber: '7001', parentPassword: synthetic }), 'student with parentPassword');
  });

  it('[F1.4][H7] a user cannot store a password field on its own profile', async () => {
    const t = newcomer('n_f14', 'n_f14@x.test');
    expectDenied(await clientCreate(t, 'users/n_f14', { uid: 'n_f14', email: 'n_f14@x.test', role: 'parent', schoolId: '', password: synthetic }), 'profile with password');
  });

  it('[F1.C] CONTROL: a registration request without any password field is accepted', async () => {
    expectAllowed(await clientCreate(null, 'registrations/R_F1C', { email: 'f1c@x.test', status: 'pending', customerInfo: { email: 'f1c@x.test', name: 'x' } }), 'registration without password');
  });
});
