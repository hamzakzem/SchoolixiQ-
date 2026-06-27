import { signInWithPassword } from '../lib/auth.js';
import { pickUserByRole } from '../lib/config.js';

export function runAuthLogin(ctx) {
  const apiKey = __ENV.K6_FIREBASE_API_KEY;
  const password = __ENV.K6_TEST_PASSWORD || 'LoadTest!SchoolixIQ2026';
  const user =
    pickUserByRole(ctx.credentials, 'admin', ctx.vu) ||
    ctx.credentials[ctx.vu % Math.max(ctx.credentials.length, 1)];
  if (!user) return null;

  return signInWithPassword(apiKey, user.email, password);
}
