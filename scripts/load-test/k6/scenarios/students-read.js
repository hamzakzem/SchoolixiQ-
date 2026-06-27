import { firestoreRunQuery, queryBySchool } from '../lib/firestore.js';
import { getConfig, pickSchool } from '../lib/config.js';

export function runStudentsRead(ctx) {
  const config = getConfig();
  const school = pickSchool(ctx.schools, ctx.vu);
  if (!school || !ctx.token) return;

  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('students', school.schoolId, 50),
    { name: 'students_list' },
  );
}
