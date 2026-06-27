import { firestoreRunQuery, firestoreCreate, queryBySchool, strField, intField, timestampField } from '../lib/firestore.js';
import { getConfig, pickSchool } from '../lib/config.js';

export function runGrades(ctx) {
  const config = getConfig();
  const school = pickSchool(ctx.schools, ctx.vu);
  if (!school || !ctx.token) return;

  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('grades', school.schoolId, 20),
    { name: 'grades_read' },
  );

  if (config.skipWrites) return;

  const studentId = school.studentIds?.[0];
  const teacherUid = school.teachers?.[0]?.uid;
  if (!studentId) return;

  firestoreCreate(
    config.projectId,
    ctx.token,
    `grades?documentId=${school.schoolId}-k6-gr-${ctx.vu}`,
    {
      schoolId: strField(school.schoolId),
      classId: strField(`${school.schoolId}-c1`),
      studentId: strField(studentId),
      studentName: strField('K6 Grade Student'),
      subject: strField('رياضيات'),
      score: intField(80),
      maxScore: intField(100),
      percentage: intField(80),
      teacherId: strField(teacherUid || ''),
      loadTest: { booleanValue: true },
      testRunId: strField(config.testRunId),
      createdAt: timestampField(),
    },
    { name: 'grades_write' },
  );
}
