import { runMixedWorkload, validateConfigOrThrow } from './lib/runner.js';
import { DEFAULT_THRESHOLDS } from './lib/metrics.js';

export const options = {
  scenarios: {
    prelaunch_smoke_10: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '2m', target: 10 },
        { duration: '30s', target: 0 },
      },
      gracefulRampDown: '20s',
    },
  },
  thresholds: DEFAULT_THRESHOLDS,
};

export function setup() {
  validateConfigOrThrow();
  return {};
}

export default function () {
  runMixedWorkload(__VU);
}
