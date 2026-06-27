import { firestoreRunQuery, firestoreCreate, queryBySchool, strField, intField, timestampField } from '../lib/firestore.js';
import { getConfig, pickSchool } from '../lib/config.js';

export function runMarketplace(ctx) {
  const config = getConfig();
  const school = pickSchool(ctx.schools, ctx.vu);
  if (!school || !ctx.token) return;

  firestoreRunQuery(
    config.projectId,
    ctx.token,
    queryBySchool('market', school.schoolId, 20),
    { name: 'marketplace_read' },
  );

  if (config.skipWrites) return;

  // Metadata-only product (no image upload / FCM)
  firestoreCreate(
    config.projectId,
    ctx.token,
    `market?documentId=${school.schoolId}-k6-prod-${ctx.vu}`,
    {
      schoolId: strField(school.schoolId),
      itemName: strField(`K6 Product VU${ctx.vu}`),
      name: strField(`K6 Product VU${ctx.vu}`),
      price: intField(15000),
      stock: intField(10),
      status: strField('active'),
      imageUrl: strField(''),
      loadTest: { booleanValue: true },
      testRunId: strField(config.testRunId),
      createdAt: timestampField(),
    },
    { name: 'marketplace_write' },
  );
}
