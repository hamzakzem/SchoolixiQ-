import { firestoreGet, firestoreRunQuery, firestoreCreate, strField, boolField, timestampField } from '../lib/firestore.js';
import { getConfig, pickSchool } from '../lib/config.js';

export function runChat(ctx) {
  const config = getConfig();
  const school = pickSchool(ctx.schools, ctx.vu);
  if (!school || !ctx.token) return;

  const parent = school.parents?.[0];
  const admin = school.admin;
  if (!parent || !admin) return;

  const convId = `${school.schoolId}_${parent.uid}`;
  firestoreGet(config.projectId, ctx.token, `conversations/${convId}`, { name: 'chat_conversation' });

  firestoreRunQuery(
    config.projectId,
    ctx.token,
    {
      from: [{ collectionId: 'system_messages' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'conversationId' },
                op: 'EQUAL',
                value: { stringValue: convId },
              },
            },
          ],
        },
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 20,
    },
    { name: 'chat_messages' },
  );

  if (config.skipWrites) return;

  firestoreCreate(
    config.projectId,
    ctx.token,
    `system_messages?documentId=${convId}-k6-${ctx.vu}-${Date.now()}`,
    {
      conversationId: strField(convId),
      schoolId: strField(school.schoolId),
      senderId: strField(parent.uid),
      senderRole: strField('parent'),
      receiverId: strField(admin.uid),
      content: strField(`K6 chat message VU${ctx.vu}`),
      read: boolField(false),
      loadTest: boolField(true),
      testRunId: strField(config.testRunId),
      createdAt: timestampField(),
    },
    { name: 'chat_send' },
  );
}
