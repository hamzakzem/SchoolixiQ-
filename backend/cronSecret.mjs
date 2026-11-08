import { createHash, timingSafeEqual } from 'node:crypto';

const MAX_SECRET_LEN = 512;

/**
 * Constant-time check of the `x-cron-secret` header.
 * - Rejects missing/empty/non-string/oversized input and an unconfigured server secret.
 * - Both values are hashed first, so they always have equal length (timingSafeEqual would
 *   throw otherwise) and the comparison time does not depend on where they differ.
 */
export function cronSecretMatches(provided, secret) {
  const given = Array.isArray(provided) ? provided[0] : provided;
  if (typeof secret !== 'string' || secret.length === 0 || secret.length > MAX_SECRET_LEN) return false;
  if (typeof given !== 'string' || given.length === 0 || given.length > MAX_SECRET_LEN) return false;
  const a = createHash('sha256').update(given, 'utf8').digest();
  const b = createHash('sha256').update(secret, 'utf8').digest();
  return timingSafeEqual(a, b);
}
