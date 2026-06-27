import http from 'k6/http';
import { check } from 'k6';
import { pageLoadFailures, recordHttpResult } from './metrics.js';

export function fetchPage(baseUrl, path = '/', name = 'page') {
  const res = http.get(`${baseUrl}${path}`, {
    tags: { type: 'read', name },
    timeout: '30s',
  });

  const ok = check(res, {
    [`${name} status 200`]: (r) => r.status === 200,
    [`${name} has html`]: (r) => (r.body || '').includes('<!DOCTYPE') || (r.body || '').includes('<html'),
  });

  if (!ok) pageLoadFailures.add(1);
  recordHttpResult(res, { type: 'read' });
  return res;
}

export function fetchApi(backendUrl, path, token, method = 'GET', body = null) {
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { type: method === 'GET' ? 'read' : 'write', name: path },
  };

  const url = `${backendUrl}${path}`;
  const res =
    method === 'GET'
      ? http.get(url, params)
      : http.post(url, body ? JSON.stringify(body) : null, params);

  recordHttpResult(res, { type: method === 'GET' ? 'read' : 'write' });
  return res;
}
