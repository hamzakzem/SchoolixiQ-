import http from 'k6/http';
import { trackFirestoreResponse, recordHttpResult } from './metrics.js';

function dbBase(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

export function firestoreGet(projectId, token, docPath, tags = {}) {
  const res = http.get(`${dbBase(projectId)}/${docPath}`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { type: 'read', ...tags },
  });
  trackFirestoreResponse(res);
  recordHttpResult(res, { type: 'read' });
  return res;
}

export function firestoreRunQuery(projectId, token, structuredQuery, tags = {}) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const res = http.post(url, JSON.stringify({ structuredQuery }), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { type: 'read', ...tags },
  });
  trackFirestoreResponse(res);
  recordHttpResult(res, { type: 'read' });
  return res;
}

export function firestoreCreate(projectId, token, collectionId, fields, tags = {}) {
  const url = `${dbBase(projectId)}/${collectionId}`;
  const res = http.post(
    url,
    JSON.stringify({ fields }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      tags: { type: 'write', ...tags },
    },
  );
  trackFirestoreResponse(res);
  recordHttpResult(res, { type: 'write' });
  return res;
}

export function queryBySchool(collectionId, schoolId, limit = 25) {
  return {
    from: [{ collectionId }],
    where: {
      compositeFilter: {
        op: 'AND',
        filters: [
          {
            fieldFilter: {
              field: { fieldPath: 'schoolId' },
              op: 'EQUAL',
              value: { stringValue: schoolId },
            },
          },
        ],
      },
    },
    limit,
  };
}

export function strField(value) {
  return { stringValue: String(value) };
}

export function boolField(value) {
  return { booleanValue: !!value };
}

export function intField(value) {
  return { integerValue: String(value) };
}

export function timestampField(date = new Date()) {
  return { timestampValue: date.toISOString() };
}
