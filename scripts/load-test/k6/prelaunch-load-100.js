import { runMixedWorkload, validateConfigOrThrow } from './lib/runner.js';
import { DEFAULT_THRESHOLDS } from './lib/metrics.js';

export const options = {
  scenarios: {
    prelaunch_load_100: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '5m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      },
      gracefulRampDown: '30s',
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
