import { firebaseLogin, refreshIdToken, jwtExpiresAtMs } from './cert-rest.mjs';

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Cache Firebase sessions per user — login once, refresh on expiry/401.
 */
export class SessionCache {
  constructor(apiKey, password) {
    this.apiKey = apiKey;
    this.password = password;
    /** @type {Map<string, object>} */
    this.sessions = new Map();
    this.stats = {
      loginAttempts: 0,
      loginFailures: 0,
      refreshAttempts: 0,
      refreshFailures: 0,
    };
  }

  async ensure(user) {
    const key = user.email || user.uid;
    const existing = this.sessions.get(key);
    if (existing && existing.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
      return existing;
    }
    if (existing?.refreshToken) {
      return this.refreshSession(key, existing);
    }
    return this.loginUser(user);
  }

  async loginUser(user) {
    const key = user.email || user.uid;
    this.stats.loginAttempts += 1;
    try {
      const raw = await firebaseLogin(this.apiKey, user.email, this.password);
      const session = {
        idToken: raw.idToken,
        refreshToken: raw.refreshToken,
        localId: raw.localId || user.uid,
        email: raw.email || user.email,
        expiresAt: jwtExpiresAtMs(raw.idToken),
      };
      this.sessions.set(key, session);
      return session;
    } catch (err) {
      this.stats.loginFailures += 1;
      throw err;
    }
  }

  async refreshSession(key, existing) {
    this.stats.refreshAttempts += 1;
    try {
      const raw = await refreshIdToken(this.apiKey, existing.refreshToken);
      const session = {
        idToken: raw.idToken,
        refreshToken: raw.refreshToken,
        localId: raw.localId || existing.localId,
        email: existing.email,
        expiresAt: Date.now() + raw.expiresIn * 1000,
      };
      this.sessions.set(key, session);
      return session;
    } catch (err) {
      this.stats.refreshFailures += 1;
      this.sessions.delete(key);
      throw err;
    }
  }

  /** Re-auth after 401 on Firestore call. */
  async handleUnauthorized(user) {
    const key = user.email || user.uid;
    const existing = this.sessions.get(key);
    if (existing?.refreshToken) {
      try {
        return await this.refreshSession(key, existing);
      } catch {
        return this.loginUser(user);
      }
    }
    return this.loginUser(user);
  }

  getAuthFailureCount() {
    return this.stats.loginFailures + this.stats.refreshFailures;
  }
}

export async function warmSessions(sessionCache, users, concurrency = 10) {
  const queue = [...users];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const user = queue.shift();
      await sessionCache.ensure(user);
    }
  });
  await Promise.all(workers);
}

export async function withToken(sessionCache, user, projectId, fn) {
  let session = await sessionCache.ensure(user);
  try {
    return await fn(session.idToken, session);
  } catch (err) {
    if (err?.status === 401 || err?.kind === 'auth_failure') {
      session = await sessionCache.handleUnauthorized(user);
      return fn(session.idToken, session);
    }
    throw err;
  }
}
