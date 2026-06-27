import { firestoreRunQuery, firestoreGet, queryBySchool } from '../lib/firestore.js';
import { getConfig, pickSchool, pickUserByRole } from '../lib/config.js';

export function runParentDashboard(ctx) {
  const config = getConfig();
  const school = pickSchool(ctx.schools, ctx.vu);
  const parent = pickUserByRole(ctx.credentials, 'parent', ctx.vu);
  if (!school || !ctx.token || !parent) return;

  firestoreGet(config.projectId, ctx.token, `users/${parent.uid}`, { name: 'parent_profile' });
  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('students', school.schoolId, 10),
    { name: 'parent_students' },
  );
  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('homework', school.schoolId, 10),
    { name: 'parent_homework' },
  );
  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('grades', school.schoolId, 10),
    { name: 'parent_grades' },
  );
}
