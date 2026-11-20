// F (cleanup worker). Exercises backend/credentialScrub.mjs in-process against the Firestore emulator
// with synthetic documents only. The module is imported, never modified.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { adminDb, admin, resetEmulators, readDoc } from '../lib/harness.mjs';
import { scrubStoredPasswords } from '../../../backend/credentialScrub.mjs';

const SYN = 'Synthetic-Only-Not-Real-9!';

async function seedPasswordDocs() {
  await resetEmulators();
  const b = adminDb.batch();
  b.set(adminDb.doc('schools/S_PW'), { name: 'x', adminPassword: SYN });
  b.set(adminDb.doc('students/ST_PW'), { name: 'x', schoolId: 'S_PW', parentPassword: SYN });
  b.set(adminDb.doc('users/U_PW'), { role: 'parent', password: SYN, plainPassword: SYN, parentPassword: SYN });
  b.set(adminDb.doc('registrations/R_APPROVED'), { status: 'approved', password: SYN, adminPassword: SYN, customerInfo: { email: 'a@x.test', password: SYN } });
  b.set(adminDb.doc('registrations/R_PENDING'), { status: 'pending', customerInfo: { email: 'p@x.test', password: SYN } });
  await b.commit();
}

/** Run the scrub while capturing everything it logs. */
async function scrubCapturingLogs() {
  const lines = [];
  const orig = { log: console.log, error: console.error, warn: console.warn };
  for (const k of Object.keys(orig)) console[k] = (...a) => lines.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
  try {
    const summary = await scrubStoredPasswords(adminDb, admin);
    return { summary, logs: lines.join('\n') };
  } finally {
    Object.assign(console, orig);
  }
}

describe('F. credentialScrub worker', () => {
  beforeEach(() => seedPasswordDocs());

  it('[F4.1] CONTROL: removes plaintext passwords from schools, students, users and non-pending registrations', async () => {
    await scrubCapturingLogs();
    assert.equal((await readDoc('schools/S_PW')).adminPassword, undefined);
    assert.equal((await readDoc('students/ST_PW')).parentPassword, undefined);
    const u = await readDoc('users/U_PW');
    assert.deepEqual([u.password, u.plainPassword, u.parentPassword], [undefined, undefined, undefined]);
    const r = await readDoc('registrations/R_APPROVED');
    assert.deepEqual([r.password, r.adminPassword, r.customerInfo.password], [undefined, undefined, undefined]);
  });

  it('[F4.2][H7] no plaintext password remains in pending registration requests after the scrub', async () => {
    await scrubCapturingLogs();
    assert.equal((await readDoc('registrations/R_PENDING')).customerInfo.password, undefined,
      'SECURITY EXPECTATION VIOLATED — pending registrations keep a plaintext password by design (keep() rule)');
  });

  it('[F4.3][H7] more than 400 pending requests must not shield an approved request from the scrub', async () => {
    // Pending docs sort before the approved one (same value, document id order), filling every page.
    for (let i = 0; i < 401; i += 400) {
      const b = adminDb.batch();
      for (let j = i; j < Math.min(i + 400, 401); j += 1) b.set(adminDb.doc(`registrations/A_${String(j).padStart(4, '0')}`), { status: 'pending', customerInfo: { password: SYN } });
      await b.commit();
    }
    await adminDb.doc('registrations/Z_APPROVED').set({ status: 'approved', customerInfo: { password: SYN } });
    await scrubCapturingLogs();
    assert.equal((await readDoc('registrations/Z_APPROVED')).customerInfo.password, undefined,
      'SECURITY EXPECTATION VIOLATED — approved request skipped because the first page held only pending requests');
  });

  it('[F4.4] the scrub never logs password values', async () => {
    const { logs } = await scrubCapturingLogs();
    assert.ok(!logs.includes(SYN), 'password value appeared in scrub logs');
  });
});
