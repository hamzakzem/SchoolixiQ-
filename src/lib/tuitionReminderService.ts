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
  enrichTuitionReminderDisplayRows,
  filterTuitionReminderRows,
  formatTuitionAmountLabel,
  formatTuitionDueLabel,
  getDisplayableTuitionReminderRows,
  getEligibleTuitionReminderRows,
  parseTuitionDueDate,
  tuitionInstallmentsQuery,
  tuitionParentsQuery,
  tuitionPaymentsQuery,
  tuitionStudentsQuery,
  toEligibilityConfigFromSettings,
  type EligibleTuitionReminderRow,
  type TuitionInstallment,
  type TuitionPayment,
  type TuitionReminderDisplayRow,
  type TuitionReminderFilterKey,
  type TuitionReminderTrackingSnapshot,
  type TuitionReminderViewMode,
  type TuitionStudent,
} from './tuitionModel';

export type TuitionReminderSettings = {
  enabled: boolean;
  autoRemindersEnabled: boolean;
  reminderStartAfterDays: number;
  reminderRepeatEveryDays: number;
  maxReminderCountBeforeWarning: number;
  restrictAfterDays: number;
  redWarningDurationDays: number;
  upcomingDays: number;
  /** @deprecated use reminderRepeatEveryDays */
  repeatEnabled: boolean;
  /** @deprecated use reminderRepeatEveryDays */
  intervalHours: number;
  timesPerDay: number;
  /** @deprecated use upcomingDays */
  daysBeforeEscalation: number;
  /** @deprecated use redWarningDurationDays */
  level2Hours: number;
  /** @deprecated use maxReminderCountBeforeWarning */
  level3AfterReminders: number;
};

export const DEFAULT_TUITION_REMINDER_SETTINGS: TuitionReminderSettings = {
  enabled: true,
  autoRemindersEnabled: false,
  reminderStartAfterDays: 25,
  reminderRepeatEveryDays: 3,
  maxReminderCountBeforeWarning: 3,
  restrictAfterDays: 35,
  redWarningDurationDays: 2,
  upcomingDays: 7,
  repeatEnabled: false,
  intervalHours: 72,
  timesPerDay: 1,
  daysBeforeEscalation: 7,
  level2Hours: 48,
  level3AfterReminders: 3,
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
  senderEmail?: string;
  senderRole?: string;
  senderUid?: string;
  sentFrom?: string;
  source?: string;
  channel: 'notification' | 'whatsapp_link' | 'bulk' | 'automatic';
  deliveryResult: 'sent' | 'skipped_dedup' | 'no_parent' | 'failed' | 'restored' | 'skipped_auto';
  escalationLevel?: EscalationLevel;
  amount?: number;
  dueDate?: string;
  messagePreview?: string;
  skippedReason?: string;
  sentAt?: ReturnType<typeof serverTimestamp>;
  createdAt: ReturnType<typeof serverTimestamp>;
};

function normalizeSettings(raw: Record<string, unknown> | undefined): TuitionReminderSettings {
  const base = { ...DEFAULT_TUITION_REMINDER_SETTINGS };
  if (!raw || typeof raw !== 'object') return base;
  const merged = { ...base, ...raw } as TuitionReminderSettings;
  if (merged.reminderRepeatEveryDays == null && merged.intervalHours) {
    merged.reminderRepeatEveryDays = Math.max(1, Math.ceil(merged.intervalHours / 24));
  }
  if (merged.maxReminderCountBeforeWarning == null && merged.level3AfterReminders) {
    merged.maxReminderCountBeforeWarning = merged.level3AfterReminders;
  }
  if (merged.upcomingDays == null && merged.daysBeforeEscalation) {
    merged.upcomingDays = merged.daysBeforeEscalation;
  }
  if (merged.redWarningDurationDays == null && merged.level2Hours) {
    merged.redWarningDurationDays = Math.max(1, Math.ceil(merged.level2Hours / 24));
  }
  return merged;
}

export { toEligibilityConfigFromSettings } from './tuitionModel';

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
  return normalizeSettings(raw as Record<string, unknown>);
}

export async function saveSchoolTuitionReminderSettings(
  schoolId: string,
  settings: Partial<TuitionReminderSettings>,
): Promise<void> {
  const current = await getSchoolTuitionReminderSettings(schoolId);
  await updateDoc(doc(db, 'schools', schoolId), {
    tuitionReminderSettings: { ...current, ...settings },
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
    sentAt: entry.sentAt || serverTimestamp(),
    createdAt: serverTimestamp(),
  });
}

function computeEscalationLevel(
  reminderCount: number,
  delayDays: number,
  settings: TuitionReminderSettings,
): EscalationLevel {
  const maxBefore =
    settings.maxReminderCountBeforeWarning ?? settings.level3AfterReminders ?? 3;
  const restrictDays = settings.restrictAfterDays ?? 35;
  if (reminderCount >= maxBefore && delayDays >= restrictDays) return 3;
  const warningDays =
    settings.redWarningDurationDays ?? Math.ceil((settings.level2Hours || 48) / 24);
  if (delayDays >= warningDays || reminderCount >= maxBefore) return 2;
  return 1;
}

export async function shouldSkipDuplicateReminder(
  schoolId: string,
  studentId: string,
  installmentId: string | undefined,
  settings: TuitionReminderSettings,
): Promise<boolean> {
  const tracking = await getTuitionTracking(schoolId, studentId, installmentId);
  const last = tracking.lastReminderAt;
  if (!last) return false;
  const repeatDays =
    settings.reminderRepeatEveryDays ??
    Math.max(1, Math.ceil((settings.intervalHours || 72) / 24));
  const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince < repeatDays;
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
    const warningDays = settings.redWarningDurationDays ?? Math.ceil((settings.level2Hours || 48) / 24);
    until.setDate(until.getDate() + warningDays);
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
  senderEmail?: string;
  senderRole?: string;
  sentFrom?: string;
  metadataSource?: string;
  channel?: 'notification' | 'whatsapp_link' | 'bulk' | 'automatic';
  skipDedup?: boolean;
}): Promise<'sent' | 'skipped_dedup' | 'no_parent' | 'failed'> {
  const { schoolId, student, installment, senderId } = params;
  const auditBase = {
    senderEmail: params.senderEmail,
    senderRole: params.senderRole,
    senderUid: senderId,
    sentFrom: params.sentFrom,
    source: params.metadataSource,
  };
  if (student.schoolId && student.schoolId !== schoolId) return 'failed';

  const dueDateIso =
    installment.dueDate instanceof Date
      ? installment.dueDate.toISOString()
      : typeof installment.dueDate === 'string'
        ? installment.dueDate
        : undefined;

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
        dueDate: dueDateIso,
        skippedReason: 'dedup_window',
        ...auditBase,
      });
      return 'skipped_dedup';
    }
  }

  const parentIds = await resolveStudentParentIds(student.id, schoolId);
  if (parentIds.length === 0) {
    console.info('[TuitionReminder] SEND_NOTIFICATION skipped — no linked parent', {
      studentId: student.id,
      schoolId,
    });
    await logReminderAudit({
      schoolId,
      studentId: student.id,
      installmentId: installment.id,
      sentBy: senderId,
      channel: params.channel || 'notification',
      deliveryResult: 'no_parent',
      amount: installment.amount,
      dueDate: dueDateIso,
      skippedReason: 'no_linked_parent',
      ...auditBase,
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
  const reminderPayload = buildTuitionReminderPayload(
    student,
    installment,
    senderId,
    schoolId,
    message,
  );
  const metadataSource = params.metadataSource || reminderPayload.metadata.source;

  const ok = await notificationService.sendWithDedup({
    userId: parentIds[0],
    recipientId: parentIds[0],
    receiverId: parentIds[0],
    title:
      escalationLevel >= 2
        ? `\u062a\u0646\u0628\u064a\u0647 \u0623\u0642\u0633\u0627\u0637 \u0645\u0633\u062a\u062d\u0642`
        : `\u062a\u0630\u0643\u064a\u0631 \u0628\u0642\u0633\u0637 \u0645\u062f\u0631\u0633\u064a`,
    message,
    type: 'tuition',
    schoolId,
    senderId,
    senderName: params.senderName,
    senderRole: params.senderRole,
    metadata: {
      ...reminderPayload.metadata,
      source: metadataSource,
      studentId: student.id,
      installmentId: installment.id,
      amount: installment.amount,
      dueDate: dueDateIso || dueLabel,
      dedupKey,
      routeTarget: 'tuition',
      escalationLevel,
      installmentAlert: true,
      senderName: params.senderName,
      senderEmail: params.senderEmail,
      senderUid: senderId,
      senderRole: params.senderRole,
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
      dueDate: dueDateIso,
      ...auditBase,
    });
    return 'failed';
  }

  console.info('[TuitionReminder] LINKED_PARENT_FOUND', {
    studentId: student.id,
    parentId: parentIds[0],
    installmentId: installment.id,
    source: params.metadataSource || params.sentFrom,
  });

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
    dueDate: dueDateIso,
    messagePreview: message.slice(0, 120),
    ...auditBase,
  });

  console.info('[TuitionReminder] SEND_NOTIFICATION_SUCCESS', {
    studentId: student.id,
    parentId: parentIds[0],
    installmentId: installment.id,
    type: 'tuition',
    routeTarget: 'tuition',
    source: params.metadataSource || params.sentFrom,
  });

  return 'sent';
}

/** Unified send entry — manual, overview, dashboard, and automatic reminders. */
export async function sendTuitionReminder(
  params: Parameters<typeof sendTuitionReminderWithTracking>[0],
): Promise<'sent' | 'skipped_dedup' | 'no_parent' | 'failed'> {
  return sendTuitionReminderWithTracking(params);
}

export function logWhatsAppQueueCreated(params: {
  schoolId: string;
  studentId: string;
  parentId?: string;
  phone: string;
  source: string;
}): void {
  console.info('[TuitionReminder] WHATSAPP_QUEUE_CREATED', {
    schoolId: params.schoolId,
    studentId: params.studentId,
    parentId: params.parentId,
    phonePrefix: params.phone.replace(/\D/g, '').slice(0, 6),
    source: params.source,
  });
}

/** Overview quick action — parent notification only, with audit trail. */
export async function sendOverviewQuickActionReminder(params: {
  schoolId: string;
  schoolName: string;
  student: { id: string; name?: string; schoolId?: string; parentPhone?: string };
  installment: { id?: string; amount?: number; dueDate?: string | Date };
  senderId: string;
  senderName?: string;
  senderEmail?: string;
  senderRole?: string;
}): Promise<'sent' | 'skipped_dedup' | 'no_parent' | 'failed'> {
  return sendTuitionReminder({
    ...params,
    channel: 'notification',
    metadataSource: 'overview_quick_action',
    sentFrom: 'admin_overview_quick_action',
  });
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

async function loadSchoolTuitionSnapshot(schoolId: string) {
  const [studentsSnap, installmentsSnap, paymentsSnap, trackingSnap, parentsSnap] =
    await Promise.all([
      getDocs(tuitionStudentsQuery(schoolId)),
      getDocs(tuitionInstallmentsQuery(schoolId)),
      getDocs(tuitionPaymentsQuery(schoolId)),
      getDocs(
        query(collection(db, 'tuition_reminder_tracking'), where('schoolId', '==', schoolId)),
      ),
      getDocs(tuitionParentsQuery(schoolId)),
    ]);

  const students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const installments = installmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as TuitionInstallment[];
  const payments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as TuitionPayment[];

  const tracking: Record<string, TuitionReminderTrackingSnapshot> = {};
  trackingSnap.docs.forEach((d) => {
    const data = d.data();
    tracking[d.id] = {
      reminderCount: data.reminderCount,
      escalationLevel: data.escalationLevel,
      parentStatus: data.parentStatus,
      lastReminderAt: data.lastReminderAt?.toDate?.() ?? null,
    };
  });

  const parents: Record<string, any> = {};
  parentsSnap.docs.forEach((d) => {
    parents[d.id] = { id: d.id, ...d.data() };
  });

  return { students, installments, payments, tracking, parents };
}

/** Automatic reminders — call from Cloud Scheduler via backend endpoint (not frontend timers). */
export async function runAutomaticTuitionRemindersForSchool(
  schoolId: string,
  schoolName: string,
): Promise<{ processed: number; sent: number; skipped: number; failed: number }> {
  const settings = await getSchoolTuitionReminderSettings(schoolId);
  if (!settings.enabled || !settings.autoRemindersEnabled) {
    return { processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const { students, installments, payments, tracking, parents } =
    await loadSchoolTuitionSnapshot(schoolId);

  const snapshot = buildTuitionReminderRowsSnapshot({
    students,
    installments,
    payments,
    settings,
    tracking,
    parents,
    schoolId,
    filter: 'auto_eligible',
    search: '',
    logContext: 'automatic',
  });

  const eligible = snapshot.eligibleRows.filter((row) => row.autoReminderEligible);

  console.info('[TuitionReminder] AUTO_REMINDER_TRIGGER', {
    schoolId,
    candidates: eligible.length,
    autoRemindersEnabled: settings.autoRemindersEnabled,
    reminderStartAfterDays: settings.reminderStartAfterDays,
    reminderRepeatEveryDays: settings.reminderRepeatEveryDays,
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of eligible) {
    const student = row.student || students.find((s) => s.id === row.studentId);
    const result = await sendTuitionReminder({
      schoolId,
      schoolName,
      student: student || { id: row.studentId, name: row.studentName },
      installment: {
        id: row.installmentId,
        amount: row.amount,
        dueDate: row.dueDate,
      },
      senderId: 'system_auto_tuition',
      senderName: 'SchoolixIQ التذكير التلقائي',
      senderRole: 'system',
      sentFrom: 'automatic_tuition_reminder',
      metadataSource: 'automatic_tuition_reminder',
      channel: 'automatic',
    });

    if (result === 'sent') sent++;
    else if (result === 'skipped_dedup') skipped++;
    else if (result === 'no_parent') skipped++;
    else failed++;
  }

  return { processed: eligible.length, sent, skipped, failed };
}

import {
  runTuitionReminderDiagnostics,
  type TuitionReminderDiagnostics,
} from './tuitionReminderDebug';

export type TuitionReminderRowsSnapshot = {
  eligibleRows: EligibleTuitionReminderRow[];
  displayableRows: EligibleTuitionReminderRow[];
  filteredRows: EligibleTuitionReminderRow[];
  displayRows: TuitionReminderDisplayRow[];
  hiddenNoParent: number;
  hiddenLater: number;
  diagnostics: TuitionReminderDiagnostics;
};

function logEligibleRowsExpanded(
  logContext: string,
  schoolId: string,
  eligibleRows: EligibleTuitionReminderRow[],
  displayableRows: EligibleTuitionReminderRow[],
  filteredRows: EligibleTuitionReminderRow[],
  parentsCount: number,
  hiddenNoParent: number,
  viewMode: TuitionReminderViewMode,
): void {
  const rowsByBucket = {
    overdue: eligibleRows.filter((r) => r.bucket === 'overdue').length,
    today: eligibleRows.filter((r) => r.bucket === 'today').length,
    soon: eligibleRows.filter((r) => r.bucket === 'soon').length,
    later: eligibleRows.filter((r) => r.bucket === 'later').length,
  };
  const withLinkedParent = eligibleRows.filter((r) => r.hasLinkedParent).length;
  const noParentReasons = eligibleRows
    .filter((r) => !r.hasLinkedParent)
    .slice(0, 10)
    .map((r) => ({
      studentId: r.studentId,
      studentName: r.studentName,
      parentIds: (r.student?.parentIds || []).join(', ') || '(none)',
      parentEmail: r.student?.parentEmail || '(none)',
      bucket: r.bucket,
    }));

  const summary = {
    context: logContext,
    schoolId,
    viewMode,
    rowsBeforeParentFilter: eligibleRows.length,
    rowsAfterParentFilter: displayableRows.length,
    displayable: displayableRows.length,
    filtered: filteredRows.length,
    hiddenNoParent,
    withLinkedParent,
    rowsByBucket,
    parentsCount,
  };

  console.log('[TuitionReminder] ELIGIBLE_ROWS', JSON.stringify(summary, null, 2));
  console.table(summary);
  console.table(
    eligibleRows.slice(0, 10).map((r) => ({
      student: r.studentName,
      bucket: r.bucket,
      amount: r.amount,
      linked: r.hasLinkedParent ? 'yes' : 'no',
      parentIds: (r.student?.parentIds || []).length,
      delayDays: r.delayDays,
    })),
  );
  if (noParentReasons.length > 0) {
    console.table(noParentReasons);
  }
}

/** Single row pipeline for Overview quick action + Tuition Reminder Dashboard. */
export function buildTuitionReminderRowsSnapshot(params: {
  students: TuitionStudent[];
  installments: TuitionInstallment[];
  payments: TuitionPayment[];
  settings: TuitionReminderSettings;
  tracking: Record<string, TuitionReminderTrackingSnapshot>;
  parents: Record<string, any>;
  schoolId: string;
  filter: TuitionReminderFilterKey;
  search: string;
  logContext?: string;
  queryErrors?: Record<string, string>;
  viewMode?: TuitionReminderViewMode;
}): TuitionReminderRowsSnapshot {
  const {
    students,
    installments,
    payments,
    settings,
    tracking,
    parents,
    schoolId,
    filter,
    search,
    logContext = 'sync',
    queryErrors = {},
    viewMode = 'dashboard',
  } = params;

  const eligibleRows = getEligibleTuitionReminderRows({
    students,
    installments,
    payments,
    settings: toEligibilityConfigFromSettings(settings),
    tracking,
    schoolId,
    parents,
  });

  const { displayRows: displayableRows, hiddenNoParent, hiddenLater } =
    getDisplayableTuitionReminderRows(eligibleRows, viewMode);

  const filteredRows = filterTuitionReminderRows(
    displayableRows,
    filter,
    search,
    parents,
    viewMode,
  );
  const displayRows = enrichTuitionReminderDisplayRows(filteredRows, parents);

  const parentsCount = Object.keys(parents).length;
  logEligibleRowsExpanded(
    logContext,
    schoolId,
    eligibleRows,
    displayableRows,
    filteredRows,
    parentsCount,
    hiddenNoParent,
    viewMode,
  );

  const diagnostics = runTuitionReminderDiagnostics({
    students,
    installments,
    payments,
    settings,
    tracking,
    parents,
    schoolId,
    eligibleRows,
    displayableRows,
    filteredRows,
    hiddenNoParent,
    hiddenLater,
    filter,
    queryErrors,
    logContext,
  });

  return {
    eligibleRows,
    displayableRows,
    filteredRows,
    displayRows,
    hiddenNoParent,
    hiddenLater,
    diagnostics,
  };
}

export async function fetchRestrictedParentAccounts(schoolId: string): Promise<
  Array<{
    parentId: string;
    name: string;
    email?: string;
    escalationLevel?: number;
    restrictedFeatures?: string[];
  }>
> {
  const snap = await getDocs(tuitionParentsQuery(schoolId));
  return snap.docs
    .map((d) => {
      const data = d.data();
      const restrictions = data.privilegeRestrictions;
      if (!restrictions) return null;
      const level = restrictions.tuitionEscalationLevel ?? 0;
      const hasWarning = Boolean(restrictions.tuitionWarningUntil);
      if (!restrictions.parentPrivilegesRestricted && level < 2 && !hasWarning) {
        return null;
      }
      return {
        parentId: d.id,
        name: data.displayName || data.name || 'ولي أمر',
        email: data.email,
        escalationLevel: level,
        restrictedFeatures: restrictions.restrictedFeatures || [],
      };
    })
    .filter(Boolean) as Array<{
    parentId: string;
    name: string;
    email?: string;
    escalationLevel?: number;
    restrictedFeatures?: string[];
  }>;
}
