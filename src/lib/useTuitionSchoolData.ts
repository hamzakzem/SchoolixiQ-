import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import {
  tuitionInstallmentsQuery,
  tuitionPaymentsQuery,
  tuitionStudentsQuery,
  type TuitionInstallment,
  type TuitionStudent,
} from './tuitionModel';
import {
  logTuitionListenerDebug,
  logTuitionListenerError,
  logTuitionListenerSnapshot,
} from './tuitionQueryDebug';

/** Real-time tuition data subscriptions shared with Tuition.tsx */
export function useTuitionSchoolData(schoolId: string | undefined) {
  const [students, setStudents] = useState<TuitionStudent[]>([]);
  const [installments, setInstallments] = useState<TuitionInstallment[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryErrors, setQueryErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!schoolId) {
      console.info('[TuitionReminderFirestore] SKIP_LISTENERS', {
        reason: 'schoolId is empty/undefined',
        schoolId: schoolId ?? '(undefined)',
      });
      setStudents([]);
      setInstallments([]);
      setPayments([]);
      setQueryErrors({});
      return;
    }

    setLoading(true);
    setQueryErrors({});

    logTuitionListenerDebug('TUITION_STUDENTS', schoolId, 'students', [
      "where('schoolId', '==', schoolId)",
      'limit(1000)',
    ]);
    logTuitionListenerDebug('TUITION_INSTALLMENTS', schoolId, 'installments', [
      "where('schoolId', '==', schoolId)",
      'limit(500)',
    ]);
    logTuitionListenerDebug('TUITION_PAYMENTS', schoolId, 'payments', [
      "where('schoolId', '==', schoolId)",
      "orderBy('createdAt', 'desc')",
      'limit(500)',
    ], { compositeIndexRequired: 'payments: schoolId ASC + createdAt DESC' });

    const unsubs = [
      onSnapshot(
        tuitionStudentsQuery(schoolId),
        (snap) => {
          logTuitionListenerSnapshot('TUITION_STUDENTS', snap.size, snap.metadata.fromCache);
          setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TuitionStudent));
        },
        (error) => {
          logTuitionListenerError('TUITION_STUDENTS', error);
          const err = error as { message?: string };
          setQueryErrors((prev) => ({ ...prev, students: err?.message || String(error) }));
        },
      ),
      onSnapshot(
        tuitionInstallmentsQuery(schoolId),
        (snap) => {
          logTuitionListenerSnapshot('TUITION_INSTALLMENTS', snap.size, snap.metadata.fromCache);
          setInstallments(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TuitionInstallment));
        },
        (error) => {
          logTuitionListenerError('TUITION_INSTALLMENTS', error);
          const err = error as { message?: string };
          setQueryErrors((prev) => ({ ...prev, installments: err?.message || String(error) }));
        },
      ),
      onSnapshot(
        tuitionPaymentsQuery(schoolId),
        (snap) => {
          logTuitionListenerSnapshot('TUITION_PAYMENTS', snap.size, snap.metadata.fromCache);
          setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
        (error) => {
          logTuitionListenerError('TUITION_PAYMENTS', error);
          const err = error as { message?: string };
          setQueryErrors((prev) => ({ ...prev, payments: err?.message || String(error) }));
          setLoading(false);
        },
      ),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [schoolId]);

  return { students, installments, payments, loading, queryErrors };
}
