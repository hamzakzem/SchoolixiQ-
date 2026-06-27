import { runMixedWorkload, validateConfigOrThrow } from './lib/runner.js';
import { DEFAULT_THRESHOLDS } from './lib/metrics.js';

export const options = {
  scenarios: {
    prelaunch_stress_500: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 100 },
        { duration: '7m', target: 250 },
        { duration: '7m', target: 500 },
        { duration: '3m', target: 0 },
      ],
      gracefulRampDown: '60s',
    },
  },
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    read_duration: ['p(95)<3500'],
    write_duration: ['p(95)<4500'],
    http_req_failed: ['rate<0.03'],
    errors: ['rate<0.03'],
  },
};

export function setup() {
  validateConfigOrThrow();
  return {};
}

export default function () {
  runMixedWorkload(__VU);
}
