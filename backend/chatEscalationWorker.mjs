/**

 * Auto-escalation when assistant does not respond in time.

 */

import admin from 'firebase-admin';

import { transferConversation } from './chatAssignment.mjs';



const DEFAULT_CONFIG = {

  enabled: true,

  firstResponseTimeoutMinutes: 30,

  inactivityTimeoutMinutes: 120,

  escalationTarget: 'superadmin',

  notifySuperAdmin: true,

};



async function loadConfig(db) {

  try {

    const snap = await db.collection('system_config').doc('chat_escalation').get();

    if (snap.exists) return { ...DEFAULT_CONFIG, ...snap.data() };

  } catch {

    /* use defaults */

  }

  return DEFAULT_CONFIG;

}



async function findSuperAdminUid(db) {

  const snap = await db

    .collection('users')

    .where('role', 'in', ['superadmin', 'super_admin'])

    .limit(1)

    .get();

  return snap.empty ? null : snap.docs[0].id;

}



async function findNextAssistant(db, excludeUid) {

  const snap = await db

    .collection('users')

    .where('role', '==', 'platform_assistant')

    .limit(20)

    .get();

  const candidate = snap.docs.find((d) => d.id !== excludeUid);

  return candidate ? candidate.id : null;

}



function isOverdue(dueAt) {

  if (!dueAt) return false;

  const ms = typeof dueAt.toMillis === 'function' ? dueAt.toMillis() : Number(dueAt);

  return ms > 0 && Date.now() > ms;

}



/**

 * @param {import('firebase-admin').firestore.Firestore} db

 * @param {{ actorUid?: string }} opts

 */

export async function runChatEscalation(db, opts = {}) {

  const config = await loadConfig(db);

  if (!config.enabled) {

    return { ok: true, skipped: true, reason: 'disabled', escalated: 0 };

  }



  const snap = await db

    .collection('conversations')

    .where('conversationAssignment.status', 'in', ['assigned', 'waiting'])

    .get();



  let escalated = 0;

  const results = [];

  const systemActor = { uid: opts.actorUid || 'system', role: 'superadmin' };



  for (const doc of snap.docs) {

    const data = doc.data() || {};

    const assignment = data.conversationAssignment;

    if (!assignment) continue;

    if (assignment.assignedToRole === 'superadmin') continue;



    const overdue =

      isOverdue(assignment.firstResponseDueAt) ||

      (assignment.status === 'waiting' && isOverdue(assignment.lastResponseAt));



    if (!overdue) continue;



    let targetUid = null;

    if (config.escalationTarget === 'next_available_assistant') {

      targetUid = await findNextAssistant(db, assignment.assignedToUserId);

    }

    if (!targetUid) {

      targetUid = await findSuperAdminUid(db);

    }

    if (!targetUid || targetUid === assignment.assignedToUserId) continue;



    const transferResult = await transferConversation(db, systemActor, {

      conversationId: doc.id,

      toUserId: targetUid,

      reason: 'auto_escalation_no_response',

    });



    const FieldValue = admin.firestore.FieldValue;

    await doc.ref.set(

      {

        conversationAssignment: {

          ...transferResult.conversationAssignment,

          status: 'escalated',

        },

        updatedAt: FieldValue.serverTimestamp(),

      },

      { merge: true },

    );



    await db.collection('audit_logs').add({

      action: 'CHAT_ESCALATION',

      actorId: systemActor.uid,

      conversationId: doc.id,

      fromUserId: assignment.assignedToUserId,

      toUserId: targetUid,

      createdAt: new Date(),

      timestamp: new Date(),

    });



    if (config.notifySuperAdmin) {

      const notifTargets = [targetUid];

      if (assignment.assignedToUserId) notifTargets.push(assignment.assignedToUserId);

      for (const uid of [...new Set(notifTargets)]) {

        await db.collection('notifications').add({

          userId: uid,

          title: 'تصعيد محادثة',

          message: 'تم تحويل محادثة بسبب تأخر الرد',

          type: 'chat',

          schoolId: data.schoolId || null,

          read: false,

          createdAt: FieldValue.serverTimestamp(),

          metadata: { conversationId: doc.id, routeTarget: 'chat' },

        });

      }

    }



    escalated += 1;

    results.push({ conversationId: doc.id, toUserId: targetUid });

  }



  return { ok: true, escalated, results, config };

}

