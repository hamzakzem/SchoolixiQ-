import http from 'k6/http';
import { check } from 'k6';
import { authFailures } from './metrics.js';

export function signInWithPassword(apiKey, email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const res = http.post(
    url,
    JSON.stringify({ email, password, returnSecureToken: true }),
    { headers: { 'Content-Type': 'application/json' }, tags: { type: 'auth' } },
  );

  const ok = check(res, {
    'auth status 200': (r) => r.status === 200,
    'auth has idToken': (r) => {
      try {
        return !!JSON.parse(r.body).idToken;
      } catch {
        return false;
      }
    },
  });

  if (!ok) {
    authFailures.add(1);
    return null;
  }

  const body = JSON.parse(res.body);
  return {
    idToken: body.idToken,
    refreshToken: body.refreshToken,
    localId: body.localId,
    email: body.email,
  };
}

export function signOut(idToken) {
  return http.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${__ENV.K6_FIREBASE_API_KEY}`,
    JSON.stringify({ idToken }),
    { headers: { 'Content-Type': 'application/json' }, tags: { type: 'auth' } },
  );
}
