import { runMixedWorkload, validateConfigOrThrow } from './lib/runner.js';

/** Spike test — 1000 VUs burst; writes disabled by default (K6_SKIP_WRITES=true). */
export const options = {
  scenarios: {
    prelaunch_spike_1000: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 200 },
        { duration: '2m', target: 1000 },
        { duration: '3m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '90s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
    read_duration: ['p(95)<5000'],
    auth_failures: ['count<10'],
    firestore_permission_denied: ['count==0'],
    firestore_resource_exhausted: ['count==0'],
    firestore_index_required: ['count==0'],
  },
};

export function setup() {
  validateConfigOrThrow();
  return {};
}

export default function () {
  runMixedWorkload(__VU);
}
