import { firestoreRunQuery, firestoreGet, firestoreCreate, strField, boolField, timestampField } from '../lib/firestore.js';
import { getConfig, pickSchool } from '../lib/config.js';

export function runNotifications(ctx) {
  const config = getConfig();
  const school = pickSchool(ctx.schools, ctx.vu);
  if (!school || !ctx.token) return;

  const parent = school.parents?.[ctx.vu % (school.parents?.length || 1)];
  if (!parent) return;

  firestoreRunQuery(
    config.projectId,
    ctx.token,
    {
      from: [{ collectionId: 'notifications' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'recipientId' },
                op: 'EQUAL',
                value: { stringValue: parent.uid },
              },
            },
          ],
        },
      },
      limit: 15,
    },
    { name: 'notifications_list' },
  );

  const notifId = `${school.schoolId}-k6-notif-${ctx.vu}`;
  firestoreGet(config.projectId, ctx.token, `notifications/${school.schoolId}-notif1`, {
    name: 'notifications_open',
  });

  if (config.skipWrites) return;

  firestoreCreate(
    config.projectId,
    ctx.token,
    `notifications?documentId=${notifId}`,
    {
      userId: strField(parent.uid),
      recipientId: strField(parent.uid),
      title: strField('K6 notification'),
      message: strField('Load test notification'),
      type: strField('system'),
      schoolId: strField(school.schoolId),
      read: boolField(false),
      pushDelivery: {
        mapValue: { fields: { status: strField('skipped') } },
      },
      loadTest: boolField(true),
      testRunId: strField(config.testRunId),
      createdAt: timestampField(),
    },
    { name: 'notifications_create' },
  );
}
