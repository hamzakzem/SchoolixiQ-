/** Firestore REST + Firebase Auth helpers for certification tests. */

export function classifyError(status, bodyText) {
  const text = `${status} ${bodyText}`.toLowerCase();
  if (
    status === 400 &&
    (text.includes('invalid_argument') ||
      text.includes('invalid json') ||
      text.includes('unknown name') ||
      text.includes('structuredquery'))
  ) {
    return 'script_error';
  }
  if (
    status === 409 ||
    text.includes('already exists') ||
    text.includes('already_exists')
  ) {
    return 'script_error';
  }
  if (text.includes('permission_denied') || text.includes('permission denied')) {
    return 'permission_denied';
  }
  if (text.includes('resource_exhausted') || text.includes('quota')) {
    return 'resource_exhausted';
  }
  if (text.includes('deadline_exceeded') || text.includes('deadline exceeded')) {
    return 'deadline_exceeded';
  }
  if (text.includes('unavailable')) {
    return 'unavailable';
  }
  if (text.includes('failed_precondition') && text.includes('index')) {
    return 'index_required';
  }
  if (status === 401 || text.includes('unauthenticated')) {
    return 'auth_failure';
  }
  if (status === 429 || text.includes('too many requests') || text.includes('rate limit')) {
    return 'rate_limit';
  }
  return 'other';
}

export function firestoreApiBase(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`;
}

export function firestoreBase(projectId) {
  return `${firestoreApiBase(projectId)}/documents`;
}

export async function firebaseLogin(apiKey, email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await res.text();
  if (!res.ok) {
    const err = new Error(`Auth failed (${res.status}): ${body.slice(0, 200)}`);
    err.kind = res.status === 429 ? 'rate_limit' : 'auth_failure';
    throw err;
  }
  const json = JSON.parse(body);
  if (!json.idToken) throw new Error('Auth response missing idToken');
  return {
    idToken: json.idToken,
    refreshToken: json.refreshToken,
    localId: json.localId,
    email: json.email,
  };
}

export async function refreshIdToken(apiKey, refreshToken) {
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    const err = new Error(`Token refresh failed (${res.status}): ${body.slice(0, 200)}`);
    err.kind = res.status === 429 ? 'rate_limit' : 'auth_failure';
    throw err;
  }
  const json = JSON.parse(body);
  return {
    idToken: json.id_token,
    refreshToken: json.refresh_token || refreshToken,
    localId: json.user_id,
    expiresIn: Number(json.expires_in) || 3600,
  };
}

export function jwtExpiresAtMs(idToken) {
  try {
    const payload = idToken.split('.')[1];
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return (json.exp || 0) * 1000;
  } catch {
    return Date.now() + 55 * 60 * 1000;
  }
}

async function parseResponse(res, label) {
  const body = await res.text();
  if (!res.ok) {
    const kind = classifyError(res.status, body);
    const err = new Error(`${label} (${res.status}): ${body.slice(0, 200)}`);
    err.kind = kind;
    err.status = res.status;
    throw err;
  }
  return body ? JSON.parse(body) : {};
}

export async function firestoreGet(projectId, token, docPath) {
  const res = await fetch(`${firestoreBase(projectId)}/${docPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse(res, `GET ${docPath}`);
}

/** POST .../documents:runQuery with structuredQuery at body root. */
export async function firestoreRunQuery(projectId, token, structuredQuery) {
  const url = `${firestoreApiBase(projectId)}/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ structuredQuery }),
  });
  return parseResponse(res, 'runQuery');
}

export async function firestoreCreate(projectId, token, collectionId, documentId, fields) {
  const url = `${firestoreBase(projectId)}/${collectionId}?documentId=${encodeURIComponent(documentId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  return parseResponse(res, `CREATE ${collectionId}/${documentId}`);
}

export async function firestorePatch(projectId, token, docPath, fields, updateMask) {
  const mask = updateMask.map((f) => `updateMask.fieldPaths=${f}`).join('&');
  const url = `${firestoreBase(projectId)}/${docPath}?${mask}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  return parseResponse(res, `PATCH ${docPath}`);
}

export async function firestoreDelete(projectId, token, docPath) {
  const res = await fetch(`${firestoreBase(projectId)}/${docPath}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return {};
  return parseResponse(res, `DELETE ${docPath}`);
}

export function strField(v) {
  return { stringValue: String(v) };
}
export function boolField(v) {
  return { booleanValue: !!v };
}
export function intField(v) {
  return { integerValue: String(v) };
}
export function tsField(d = new Date()) {
  return { timestampValue: d.toISOString() };
}
export function mapField(obj) {
  return { mapValue: { fields: obj } };
}

export function queryBySchool(collectionId, schoolId, limit = 25) {
  return {
    from: [{ collectionId }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'schoolId' },
        op: 'EQUAL',
        value: { stringValue: schoolId },
      },
    },
    limit,
  };
}

export function queryStudentsByClass(schoolId, classId, limit = 25) {
  return {
    from: [{ collectionId: 'students' }],
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
          {
            fieldFilter: {
              field: { fieldPath: 'classId' },
              op: 'EQUAL',
              value: { stringValue: classId },
            },
          },
        ],
      },
    },
    limit,
  };
}

export function queryStudentsByParent(uid, limit = 25) {
  return {
    from: [{ collectionId: 'students' }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'parentIds' },
        op: 'ARRAY_CONTAINS',
        value: { stringValue: uid },
      },
    },
    limit,
  };
}

export function queryNotificationsForUser(uid, schoolId, limit = 15) {
  const filters = [
    {
      fieldFilter: {
        field: { fieldPath: 'userId' },
        op: 'EQUAL',
        value: { stringValue: uid },
      },
    },
  ];
  if (schoolId) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: 'schoolId' },
        op: 'EQUAL',
        value: { stringValue: schoolId },
      },
    });
  }
  return {
    from: [{ collectionId: 'notifications' }],
    where: filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } },
    limit,
  };
}

export function queryHomeworkForTeacher(schoolId, classId, teacherId, limit = 20) {
  return {
    from: [{ collectionId: 'homework' }],
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
          {
            fieldFilter: {
              field: { fieldPath: 'classId' },
              op: 'EQUAL',
              value: { stringValue: classId },
            },
          },
          {
            fieldFilter: {
              field: { fieldPath: 'teacherId' },
              op: 'EQUAL',
              value: { stringValue: teacherId },
            },
          },
        ],
      },
    },
    limit,
  };
}

export function parseStringField(doc, fieldPath) {
  const v = doc?.fields?.[fieldPath];
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.arrayValue?.values) {
    return v.arrayValue.values.map((x) => x.stringValue).filter(Boolean);
  }
  return null;
}

export function loadTestFields(testRunId) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return {
    loadTest: boolField(true),
    testRunId: strField(testRunId),
    createdByLoadTest: boolField(true),
    expiresAt: tsField(expiresAt),
  };
}

export async function fetchHttp(url, options = {}) {
  const res = await fetch(url, { redirect: 'follow', ...options });
  const body = await res.text();
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${url}`);
    err.kind = res.status === 429 ? 'rate_limit' : 'other';
    throw err;
  }
  return { status: res.status, body, bytes: body.length };
}
