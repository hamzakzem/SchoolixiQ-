import { firestoreRunQuery, firestoreCreate, queryBySchool, strField, timestampField } from '../lib/firestore.js';
import { getConfig, pickSchool } from '../lib/config.js';

export function runHomework(ctx) {
  const config = getConfig();
  const school = pickSchool(ctx.schools, ctx.vu);
  if (!school || !ctx.token) return;

  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('homework', school.schoolId, 20),
    { name: 'homework_read' },
  );

  if (config.skipWrites) return;

  firestoreCreate(
    config.projectId,
    ctx.token,
    `homework?documentId=${school.schoolId}-k6-hw-${ctx.vu}`,
    {
      title: strField(`K6 Homework VU${ctx.vu}`),
      content: strField('Load test homework body'),
      schoolId: strField(school.schoolId),
      classId: strField(`${school.schoolId}-c1`),
      teacherId: strField(school.teachers?.[0]?.uid || ''),
      loadTest: { booleanValue: true },
      testRunId: strField(config.testRunId),
      createdAt: timestampField(),
    },
    { name: 'homework_write' },
  );
}
