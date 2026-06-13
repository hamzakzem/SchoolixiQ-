import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import {
  tuitionInstallmentsQuery,
  tuitionPaymentsQuery,
  tuitionStudentsQuery,
  type TuitionInstallment,
  type TuitionStudent,
} from './tuitionModel';

/** Real-time tuition data subscriptions shared with Tuition.tsx */
export function useTuitionSchoolData(schoolId: string | undefined) {
  const [students, setStudents] = useState<TuitionStudent[]>([]);
  const [installments, setInstallments] = useState<TuitionInstallment[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!schoolId) {
      setStudents([]);
      setInstallments([]);
      setPayments([]);
      return;
    }

    setLoading(true);
    const unsubs = [
      onSnapshot(tuitionStudentsQuery(schoolId), (snap) => {
        setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TuitionStudent));
      }),
      onSnapshot(tuitionInstallmentsQuery(schoolId), (snap) => {
        setInstallments(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TuitionInstallment));
      }),
      onSnapshot(tuitionPaymentsQuery(schoolId), (snap) => {
        setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [schoolId]);

  return { students, installments, payments, loading };
}
