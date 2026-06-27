import { firestoreRunQuery, firestoreGet, queryBySchool } from '../lib/firestore.js';
import { getConfig, pickSchool, pickUserByRole } from '../lib/config.js';

export function runTeacherDashboard(ctx) {
  const config = getConfig();
  const school = pickSchool(ctx.schools, ctx.vu);
  const teacher = pickUserByRole(ctx.credentials, 'teacher', ctx.vu);
  if (!school || !ctx.token || !teacher) return;

  firestoreGet(config.projectId, ctx.token, `users/${teacher.uid}`, { name: 'teacher_profile' });
  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('homework', school.schoolId, 15),
    { name: 'teacher_homework' },
  );
  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('grades', school.schoolId, 15),
    { name: 'teacher_grades' },
  );
  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('students', school.schoolId, 30),
    { name: 'teacher_students' },
  );
}
