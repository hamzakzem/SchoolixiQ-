import { firestoreRunQuery, queryBySchool } from '../lib/firestore.js';
import { getConfig, pickSchool } from '../lib/config.js';

export function runTuitionRead(ctx) {
  const config = getConfig();
  const school = pickSchool(ctx.schools, ctx.vu);
  if (!school || !ctx.token) return;

  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('installments', school.schoolId, 25),
    { name: 'tuition_installments' },
  );
  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('payments', school.schoolId, 25),
    { name: 'tuition_payments' },
  );
}
