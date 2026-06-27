import { runMixedWorkload, validateConfigOrThrow } from './lib/runner.js';
import { DEFAULT_THRESHOLDS } from './lib/metrics.js';

export const options = {
  scenarios: {
    prelaunch_stress_300: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 50 },
        { duration: '5m', target: 150 },
        { duration: '5m', target: 300 },
        { duration: '3m', target: 0 },
      ],
      gracefulRampDown: '45s',
    },
  },
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    read_duration: ['p(95)<3000'],
    write_duration: ['p(95)<4000'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.02'],
  },
};

export function setup() {
  validateConfigOrThrow();
  return {};
}

export default function () {
  runMixedWorkload(__VU);
}
