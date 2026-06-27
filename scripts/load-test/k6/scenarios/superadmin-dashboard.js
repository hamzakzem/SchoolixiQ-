import { firestoreGet, firestoreRunQuery } from '../lib/firestore.js';
import { getConfig } from '../lib/config.js';

export function runSuperAdminDashboard(ctx) {
  const config = getConfig();
  if (!ctx.token) return;

  firestoreGet(config.projectId, ctx.token, 'system/config', { name: 'superadmin_config' });
  firestoreRunQuery(
    config.projectId,
    ctx.token,
    {
      from: [{ collectionId: 'schools' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'loadTest' },
          op: 'EQUAL',
          value: { booleanValue: true },
        },
      },
      limit: 50,
    },
    { name: 'superadmin_schools' },
  );
}
