/** Standard load-test document tags — required on every seeded document. */
export function loadTestTags(testRunId) {
  return {
    loadTest: true,
    testRunId: String(testRunId),
  };
}

export const LOAD_TEST_EMAIL_DOMAIN = 'schoolixiq-loadtest.invalid';

export function loadTestEmail(role, schoolIndex, userIndex, testRunId) {
  const slug = String(testRunId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toLowerCase();
  return `${role}-s${schoolIndex}-u${userIndex}-${slug}@${LOAD_TEST_EMAIL_DOMAIN}`;
}

export function schoolDocId(testRunId, schoolIndex) {
  const slug = String(testRunId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
  return `lt-${slug}-s${String(schoolIndex).padStart(4, '0')}`;
}
