import { useMemo } from 'react';
import {
  buildTuitionReminderRowsSnapshot,
  type TuitionReminderRowsSnapshot,
  type TuitionReminderSettings,
} from './tuitionReminderService';
import type {
  TuitionInstallment,
  TuitionPayment,
  TuitionReminderFilterKey,
  TuitionReminderTrackingSnapshot,
  TuitionStudent,
} from './tuitionModel';

export type { TuitionReminderRowsSnapshot };

export function useTuitionReminderRows(params: {
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
    logContext,
  } = params;

  return useMemo(
    () =>
      buildTuitionReminderRowsSnapshot({
        students,
        installments,
        payments,
        settings,
        tracking,
        parents,
        schoolId,
        filter,
        search,
        logContext,
      }),
    [
      students,
      installments,
      payments,
      settings,
      tracking,
      parents,
      schoolId,
      filter,
      search,
      logContext,
    ],
  );
}
