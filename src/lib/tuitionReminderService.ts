/**
 * Tuition reminder workflow: notifications, WhatsApp links, escalation, audit.
 * No automatic WhatsApp sending — links only.
 */

import { db } from './firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { notificationService } from './notificationService';
import { resolveStudentParentIds } from './schoolSync';
import {
  buildTuitionReminderPayload,
  computeInstallmentDelayDays,
  formatTuitionAmountLabel,
  formatTuitionDueLabel,
  parseTuitionDueDate,
} from './tuitionModel';

export type TuitionReminderSettings = {
  enabled: boolean;
  repeatEnabled: boolean;
  intervalHours: number;
  timesPerDay: number;
  daysBeforeEscalation: number;
  level2Hours: number;
  level3AfterReminders: number;
};

export const DEFAULT_TUITION_REMINDER_SETTINGS: TuitionReminderSettings = {
  enabled: true,
  repeatEnabled: false,
  intervalHours: 24,
  timesPerDay: 1,
  daysBeforeEscalation: 7,
  level2Hours: 48,
  level3AfterReminders: 5,
};

export type EscalationLevel = 1 | 2 | 3 | 4;

export type TuitionTrackingRecord = {
  id?: string;
  schoolId: string;
  studentId: string;
  installmentId?: string;
  reminderCount: number;
  lastReminderAt?: Date | null;
  escalationLevel: EscalationLevel;
  parentStatus: 'active' | 'warning' | 'restricted';
  updatedAt?: unknown;
};

export type ReminderAuditEntry = {
  schoolId: string;
  studentId: string;
  installmentId?: string;
  parentId?: string;
  sentBy: string;
  sentByName?: string;
  channel: 'notification' | 'whatsapp_link' | 'bulk';
  deliveryResult: 'sent' | 'skipped_dedup' | 'no_parent' | 'failed' | 'restored';
  escalationLevel?: EscalationLevel;
  amount?: number;
  messagePreview?: string;
  createdAt: ReturnType<typeof serverTimestamp>;
};

function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0')) return '964' + digits.slice(1);
  if (digits.length >= 9) return '964' + digits;
  return digits;
}

export function buildTuitionWhatsAppMessage(params: {
  schoolName: string;
  studentName: string;
  amount: number | string;
}): string {
  const amountStr =
    typeof params.amount === 'number'
      ? params.amount.toLocaleString('ar-IQ')
      : params.amount;
  return [
    `\u062a\u0646\u0628\u064a\u0647 \u0645\u0646 \u0645\u062f\u0631\u0633\u0629 ${params.schoolName}`,
    '',
    `\u064a\u0648\u062c\u062f \u0642\u0633\u0637 \u0645\u0633\u062a\u062d\u0642 \u0644\u0644\u0637\u0627\u0644\u0628 ${params.studentName}.`,
    '',
    '\u0627\u0644\u0645\u0628\u0644\u063a:',
    amountStr,
    '',
    '\u064a\u0631\u062c\u0649 \u0645\u0631\u0627\u062c\u0639\u0629 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u062f\u0631\u0633\u0629.',
  ].join('\n');
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizePhoneForWhatsApp(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export async function getSchoolTuitionReminderSettings(
  schoolId: string,
): Promise<TuitionReminderSettings> {
  const snap = await getDoc(doc(db, 'schools', schoolId));
  const raw = snap.data()?.tuitionReminderSettings;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TUITION_REMINDER_SETTINGS };
  return { ...DEFAULT_TUITION_REMINDER_SETTINGS, ...raw };
}

export async function saveSchoolTuitionReminderSettings(
  schoolId: string,
  settings: Partial<TuitionReminderSettings>,
): Promise<void> {
  await updateDoc(doc(db, 'schools', schoolId), {
    tuitionReminderSettings: settings,
    updatedAt: serverTimestamp(),
  });
}

function trackingDocId(schoolId: string, studentId: string, installmentId?: string) {
  return installmentId
    ? `${schoolId}_${studentId}_${installmentId}`
    : `${schoolId}_${studentId}`;
}

export async function getTuitionTracking(
  schoolId: string,
  studentId: string,
  installmentId?: string,
): Promise<TuitionTrackingRecord> {
  const id = trackingDocId(schoolId, studentId, installmentId);
  const snap = await getDoc(doc(db, 'tuition_reminder_tracking', id));
  if (!snap.exists()) {
    return {
      schoolId,
      studentId,
      installmentId,
      reminderCount: 0,
      lastReminderAt: null,
      escalationLevel: 1,
      parentStatus: 'active',
    };
  }
  const d = snap.data();
  return {
    id: snap.id,
    schoolId,
    studentId,
    installmentId,
    reminderCount: d.reminderCount || 0,
    lastReminderAt: d.lastReminderAt?.toDate?.() ?? null,
    escalationLevel: (d.escalationLevel || 1) as EscalationLevel,
    parentStatus: d.parentStatus || 'active',
  };
}

/** Persist tracking with deterministic doc id. */
async function saveTracking(record: TuitionTrackingRecord): Promise<void> {
  const id = trackingDocId(record.schoolId, record.studentId, record.installmentId);
  const ref = doc(db, 'tuition_reminder_tracking', id);
  const existing = await getDoc(ref);
  const payload = {
    schoolId: record.schoolId,
    studentId: record.studentId,
    installmentId: record.installmentId || null,
    reminderCount: record.reminderCount,
    lastReminderAt: record.lastReminderAt ? Timestamp.fromDate(record.lastReminderAt) : null,
    escalationLevel: record.escalationLevel,
    parentStatus: record.parentStatus,
    updatedAt: serverTimestamp(),
  };
  if (existing.exists()) {
    await updateDoc(ref, payload);
  } else {
    await setDoc(ref, payload);
  }
}

export async function logReminderAudit(entry: Omit<ReminderAuditEntry, 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'tuition_reminder_logs'), {
    ...entry,
    createdAt: serverTimestamp(),
  });
}

function computeEscalationLevel(
  reminderCount: number,
  delayDays: number,
  settings: TuitionReminderSettings,
): EscalationLevel {
  if (reminderCount >= settings.level3AfterReminders && delayDays >= settings.daysBeforeEscalation) {
    return 3;
  }
  if (delayDays >= Math.ceil(settings.level2Hours / 24)) return 2;
  return 1;
}

export async function shouldSkipDuplicateReminder(
  schoolId: string,
  studentId: string,
  installmentId: string | undefined,
  settings: TuitionReminderSettings,
): Promise<boolean> {
  if (!settings.repeatEnabled) {
    const tracking = await getTuitionTracking(schoolId, studentId, installmentId);
    const last = tracking.lastReminderAt;
    if (!last) return false;
    const hoursSince = (Date.now() - last.getTime()) / (1000 * 60 * 60);
    return hoursSince < settings.intervalHours;
  }
  const tracking = await getTuitionTracking(schoolId, studentId, installmentId);
  const last = tracking.lastReminderAt;
  if (!last) return false;
  const hoursSince = (Date.now() - last.getTime()) / (1000 * 60 * 60);
  return hoursSince < settings.intervalHours / Math.max(1, settings.timesPerDay);
}

export async function applyParentEscalation(
  parentId: string,
  schoolId: string,
  level: EscalationLevel,
  settings: TuitionReminderSettings,
): Promise<void> {
  const userRef = doc(db, 'users', parentId);
  const snap = await getDoc(userRef);
  if (!snap.exists() || snap.data()?.schoolId !== schoolId) return;

  const restrictions: Record<string, unknown> = {
    tuitionEscalationLevel: level,
    tuitionEscalationUpdatedAt: serverTimestamp(),
  };

  if (level >= 2) {
    const until = new Date();
    until.setHours(until.getHours() + settings.level2Hours);
    restrictions.tuitionWarningUntil = Timestamp.fromDate(until);
  }
  if (level >= 3) {
    restrictions.parentPrivilegesRestricted = true;
    restrictions.restrictedFeatures = ['marketplace', 'chat', 'homework_submit'];
  } else {
    restrictions.parentPrivilegesRestricted = false;
    restrictions.restrictedFeatures = [];
  }

  await updateDoc(userRef, {
    privilegeRestrictions: restrictions,
  });
}

export async function restoreParentPrivileges(
  parentId: string,
  schoolId: string,
  restoredBy: string,
): Promise<void> {
  const userRef = doc(db, 'users', parentId);
  const snap = await getDoc(userRef);
  if (!snap.exists() || snap.data()?.schoolId !== schoolId) {
    throw new Error('Parent not found in this school');
  }

  await updateDoc(userRef, {
    privilegeRestrictions: {
      tuitionEscalationLevel: 1,
      parentPrivilegesRestricted: false,
      restrictedFeatures: [],
      tuitionWarningUntil: null,
      restoredAt: serverTimestamp(),
      restoredBy,
    },
  });

  await logReminderAudit({
    schoolId,
    studentId: '',
    parentId,
    sentBy: restoredBy,
    channel: 'notification',
    deliveryResult: 'restored',
    escalationLevel: 1,
    messagePreview: 'Parent privileges restored after payment',
  });
}

export async function sendTuitionReminderWithTracking(params: {
  schoolId: string;
  schoolName: string;
  student: { id: string; name?: string; schoolId?: string; parentPhone?: string };
  installment: { id?: string; amount?: number; dueDate?: string | Date };
  senderId: string;
  senderName?: string;
  channel?: 'notification' | 'whatsapp_link' | 'bulk';
  skipDedup?: boolean;
}): Promise<'sent' | 'skipped_dedup' | 'no_parent' | 'failed'> {
  const { schoolId, student, installment, senderId } = params;
  if (student.schoolId && student.schoolId !== schoolId) return 'failed';

  const settings = await getSchoolTuitionReminderSettings(schoolId);
  if (!settings.enabled) return 'failed';

  if (!params.skipDedup) {
    const skip = await shouldSkipDuplicateReminder(
      schoolId,
      student.id,
      installment.id,
      settings,
    );
    if (skip) {
      await logReminderAudit({
        schoolId,
        studentId: student.id,
        installmentId: installment.id,
        sentBy: senderId,
        sentByName: params.senderName,
        channel: params.channel || 'notification',
        deliveryResult: 'skipped_dedup',
        amount: installment.amount,
      });
      return 'skipped_dedup';
    }
  }

  const parentIds = await resolveStudentParentIds(student.id, schoolId);
  if (parentIds.length === 0) {
    await logReminderAudit({
      schoolId,
      studentId: student.id,
      installmentId: installment.id,
      sentBy: senderId,
      channel: params.channel || 'notification',
      deliveryResult: 'no_parent',
      amount: installment.amount,
    });
    return 'no_parent';
  }

  const dueDate = installment.dueDate ? parseTuitionDueDate(installment.dueDate) : new Date();
  const delayDays = computeInstallmentDelayDays(installment.dueDate ?? dueDate);

  const tracking = await getTuitionTracking(schoolId, student.id, installment.id);
  const newCount = tracking.reminderCount + 1;
  const escalationLevel = computeEscalationLevel(newCount, delayDays, settings);

  const amountLabel = formatTuitionAmountLabel(installment.amount);
  const dueLabel = formatTuitionDueLabel(installment.dueDate);

  const message = `\u062a\u0630\u0643\u064a\u0631 \u0628\u0642\u0633\u0637 \u0627\u0644\u0637\u0627\u0644\u0628 ${student.name || ''} \u0628\u0645\u0628\u0644\u063a ${amountLabel} \u062f.\u0639 \u0645\u0633\u062a\u062d\u0642 \u0628\u062a\u0627\u0631\u064a\u062e ${dueLabel}.`;

  const dedupKey = `tuition-${installment.id || student.id}-${newCount}-${Date.now()}`;

  const ok = await notificationService.sendWithDedup({
    userId: parentIds[0],
    title:
      escalationLevel >= 2
        ? `\u062a\u0646\u0628\u064a\u0647 \u0623\u0642\u0633\u0627\u0637 \u0645\u0633\u062a\u062d\u0642`
        : `\u062a\u0630\u0643\u064a\u0631 \u0628\u0642\u0633\u0637 \u0645\u062f\u0631\u0633\u064a`,
    message,
    type: 'tuition',
    schoolId,
    senderId,
    metadata: {
      ...buildTuitionReminderPayload(student, installment, senderId, schoolId, message).metadata,
      dedupKey,
      escalationLevel,
      installmentAlert: true,
    },
  });

  if (!ok) {
    await logReminderAudit({
      schoolId,
      studentId: student.id,
      installmentId: installment.id,
      parentId: parentIds[0],
      sentBy: senderId,
      channel: params.channel || 'notification',
      deliveryResult: 'failed',
      amount: installment.amount,
    });
    return 'failed';
  }

  const parentStatus: TuitionTrackingRecord['parentStatus'] =
    escalationLevel >= 3 ? 'restricted' : escalationLevel >= 2 ? 'warning' : 'active';

  await saveTracking({
    schoolId,
    studentId: student.id,
    installmentId: installment.id,
    reminderCount: newCount,
    lastReminderAt: new Date(),
    escalationLevel,
    parentStatus,
  });

  for (const parentId of parentIds) {
    if (escalationLevel >= 2) {
      await applyParentEscalation(parentId, schoolId, escalationLevel, settings);
    }
  }

  await logReminderAudit({
    schoolId,
    studentId: student.id,
    installmentId: installment.id,
    parentId: parentIds[0],
    sentBy: senderId,
    sentByName: params.senderName,
    channel: params.channel || 'notification',
    deliveryResult: 'sent',
    escalationLevel,
    amount: installment.amount,
    messagePreview: message.slice(0, 120),
  });

  return 'sent';
}

export async function fetchReminderLogs(
  schoolId: string,
  limitCount = 50,
): Promise<(ReminderAuditEntry & { id: string })[]> {
  const q = query(
    collection(db, 'tuition_reminder_logs'),
    where('schoolId', '==', schoolId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as ReminderAuditEntry) }))
    .sort((a, b) => {
      const ta = (a.createdAt as any)?.seconds || 0;
      const tb = (b.createdAt as any)?.seconds || 0;
      return tb - ta;
    })
    .slice(0, limitCount);
}
