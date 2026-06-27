import { firestoreGet, firestoreCreate, strField, timestampField } from '../lib/firestore.js';
import { getConfig, pickSchool } from '../lib/config.js';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function runAttendanceWrite(ctx) {
  const config = getConfig();
  const school = pickSchool(ctx.schools, ctx.vu);
  if (!school || !ctx.token) return;

  const classId = `${school.schoolId}-c1`;
  const docId = `${school.schoolId}_${classId}_${todayIso()}`;

  firestoreGet(config.projectId, ctx.token, `attendance/${docId}`, { name: 'attendance_read' });

  if (config.skipWrites) return;

  const studentId = school.studentIds?.[0];
  if (!studentId) return;

  firestoreCreate(
    config.projectId,
    ctx.token,
    `attendance?documentId=${docId}-k6-${ctx.vu}`,
    {
      schoolId: strField(school.schoolId),
      classId: strField(classId),
      date: strField(todayIso()),
      records: {
        mapValue: {
          fields: {
            [studentId]: { stringValue: 'present' },
          },
        },
      },
      loadTest: { booleanValue: true },
      testRunId: strField(config.testRunId),
      updatedAt: timestampField(),
    },
    { name: 'attendance_write' },
  );
}
