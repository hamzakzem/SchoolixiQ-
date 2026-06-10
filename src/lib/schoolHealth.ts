import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { buildDailyStudentRecords, getTodayDateStr, parseDueDate } from './dailySummaryUtils';
import { ACTIVE_DISMISSAL_STATUSES } from './dismissalTypes';

export type SchoolHealthSnapshot = {
  attendanceToday: number;
  absencesToday: number;
  overdueTuition: number;
  behaviorIncidents: number;
  activeDismissals: number;
};

export async function fetchSchoolHealthSnapshot(schoolId: string): Promise<SchoolHealthSnapshot> {
  const todayStr = getTodayDateStr();
  const now = new Date();

  const [
    attendanceSnap,
    studentsSnap,
    classesSnap,
    installmentsSnap,
    behaviorSnap,
    dismissalSnap,
  ] = await Promise.all([
    getDocs(
      query(
        collection(db, 'attendance'),
        where('schoolId', '==', schoolId),
        where('date', '==', todayStr),
      ),
    ),
    getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId))),
    getDocs(query(collection(db, 'classes'), where('schoolId', '==', schoolId))),
    getDocs(query(collection(db, 'installments'), where('schoolId', '==', schoolId))),
    getDocs(
      query(
        collection(db, 'behavior_reports'),
        where('schoolId', '==', schoolId),
      ),
    ),
    getDocs(
      query(
        collection(db, 'dismissal_requests'),
        where('schoolId', '==', schoolId),
        where('status', 'in', [...ACTIVE_DISMISSAL_STATUSES]),
      ),
    ),
  ]);

  const studentsById = new Map(
    studentsSnap.docs
      .filter((d) => !d.data().isDeleted)
      .map((d) => [d.id, d.data() as Record<string, unknown>]),
  );
  const classesById = new Map(
    classesSnap.docs
      .filter((d) => !d.data().isDeleted)
      .map((d) => [d.id, String(d.data().name || '')]),
  );

  const dailyRecords = buildDailyStudentRecords(
    attendanceSnap.docs.map((d) => ({ id: d.id, data: () => d.data() })),
    studentsById,
    classesById,
  );

  const attendanceToday = dailyRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
  const absencesToday = dailyRecords.filter((r) => r.status === 'absent').length;

  const overdueTuition = installmentsSnap.docs.filter((d) => {
    const data = d.data();
    if (data.status === 'paid' || data.isDeleted) return false;
    const due = parseDueDate(data.dueDate);
    return due.getTime() > 0 && due < now;
  }).length;

  const behaviorIncidents = behaviorSnap.docs.filter((d) => {
    const data = d.data();
    if (data.isDeleted) return false;
    const created = parseDueDate(data.createdAt || data.date);
    return created.toISOString().split('T')[0] === todayStr;
  }).length;

  return {
    attendanceToday,
    absencesToday,
    overdueTuition,
    behaviorIncidents,
    activeDismissals: dismissalSnap.size,
  };
}
