import { firestoreGet, firestoreRunQuery, queryBySchool } from '../lib/firestore.js';
import { getConfig, pickSchool } from '../lib/config.js';

export function runDashboardOverview(ctx) {
  const config = getConfig();
  const school = pickSchool(ctx.schools, ctx.vu);
  if (!school || !ctx.token) return;

  firestoreGet(config.projectId, ctx.token, `schools/${school.schoolId}`, { name: 'dashboard_school' });
  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('students', school.schoolId, 20),
    { name: 'dashboard_students' },
  );
  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('notifications', school.schoolId, 10),
    { name: 'dashboard_notifications' },
  );
}
