/**
 * Safe contact directory for Platform Assistant — Admin SDK only.
 * Returns minimal school fields: id, name, logoUrl, status.
 */

const SCHOOL_CONTACT_PERMS = new Set(['manage_schools', 'view_requests']);

function asPermissionList(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (raw && typeof raw === 'object') {
    return Object.entries(raw)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}

function mapSafeSchool(doc) {
  const data = doc.data() || {};
  const status = String(data.status ?? data.lifecycleStatus ?? 'active').toLowerCase();
  if (status === 'deleted' || status === 'archived') return null;
  if (data.deletedAt || data.permanentlyDeletedAt) return null;
  return {
    id: doc.id,
    name: String(data.name ?? doc.id),
    logoUrl: data.logoUrl ? String(data.logoUrl) : null,
    status,
    contactType: 'school',
  };
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {{ uid: string, role: string, permissions?: unknown }} actor
 */
export async function loadSafeSchoolDirectory(db, actor) {
  const uid = String(actor.uid || '');
  const role = String(actor.role || '').toLowerCase();
  const permissions = asPermissionList(actor.permissions);
  const canSeeSchools = permissions.some((p) => SCHOOL_CONTACT_PERMS.has(p));

  if (role !== 'platform_assistant') {
    const err = new Error('FORBIDDEN');
    err.status = 403;
    throw err;
  }
  if (!canSeeSchools) {
    return { schools: [], schoolsCount: 0, queryStarted: false };
  }

  const snap = await db.collection('schools').get();
  const schools = snap.docs.map(mapSafeSchool).filter(Boolean);
  schools.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  return {
    schools,
    schoolsCount: schools.length,
    queryStarted: true,
    uid,
    effectiveRole: role,
    permissions,
    errorCode: null,
  };
}
