/**
 * Structural equality for plain Firestore-style data (objects, arrays, primitives,
 * Timestamps via their toJSON). Key order does not matter. Anything that cannot be
 * serialised (e.g. a cyclic object) compares as "different", which is the safe answer.
 */
export function stableEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return stableKey(a) === stableKey(b);
  } catch {
    return false;
  }
}

function stableKey(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(val).sort()) sorted[k] = (val as Record<string, unknown>)[k];
      return sorted;
    }
    return val;
  });
}
