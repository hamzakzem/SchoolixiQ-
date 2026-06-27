import {
  firestoreCreate,
  strField,
  boolField,
  timestampField,
} from '../lib/firestore.js';
import { getConfig, pickSchool } from '../lib/config.js';

export function runStudentCreate(ctx) {
  const config = getConfig();
  if (config.skipWrites) return;

  const school = pickSchool(ctx.schools, ctx.vu);
  if (!school || !ctx.token) return;

  const studentId = `${school.schoolId}-k6-${ctx.vu}-${Date.now()}`;
  firestoreCreate(
    config.projectId,
    ctx.token,
    `students?documentId=${studentId}`,
    {
      schoolId: strField(school.schoolId),
      name: strField(`K6 Student VU${ctx.vu}`),
      classId: strField(`${school.schoolId}-c1`),
      registrationNumber: strField(`K6-${ctx.vu}`),
      loadTest: boolField(true),
      testRunId: strField(config.testRunId),
      createdAt: timestampField(),
    },
    { name: 'student_create' },
  );
}
