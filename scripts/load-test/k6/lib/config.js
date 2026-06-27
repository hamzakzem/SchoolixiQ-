import { SharedArray } from 'k6/data';

/** Runtime config from env (set before k6 run). */
export function getConfig() {
  return {
    projectId: __ENV.K6_FIREBASE_PROJECT_ID || 'yala-safari-iq',
    apiKey: __ENV.K6_FIREBASE_API_KEY || '',
    baseUrl: __ENV.K6_BASE_URL || 'http://localhost:3000',
    backendUrl: __ENV.K6_BACKEND_URL || __ENV.K6_BASE_URL || 'http://localhost:3000',
    testRunId: __ENV.K6_TEST_RUN_ID || '',
    testPassword: __ENV.K6_TEST_PASSWORD || 'LoadTest!SchoolixIQ2026',
    skipWrites: (__ENV.K6_SKIP_WRITES || 'true').toLowerCase() !== 'false',
    credentialsFile: __ENV.K6_CREDENTIALS_FILE || '',
  };
}

const credentials = new SharedArray('credentials', () => {
  const file = __ENV.K6_CREDENTIALS_FILE;
  if (!file) return [];
  try {
    return JSON.parse(open(file)).users || [];
  } catch {
    return [];
  }
});

const schools = new SharedArray('schools', () => {
  const file = __ENV.K6_CREDENTIALS_FILE;
  if (!file) return [];
  try {
    return JSON.parse(open(file)).schools || [];
  } catch {
    return [];
  }
});

export function getCredentials() {
  return credentials;
}

export function getSchools() {
  return schools;
}

export function pickSchool(schoolList, vu) {
  if (!schoolList || schoolList.length === 0) return null;
  return schoolList[vu % schoolList.length];
}

export function pickUserByRole(credList, role, vu) {
  const filtered = credList.filter((u) => u.role === role);
  if (filtered.length === 0) return null;
  return filtered[vu % filtered.length];
}
