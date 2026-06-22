import { doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { safeFirestoreSet } from '../lib/offline/offlineSync';
import type { OfflineActor } from '../lib/offline/offlineTypes';

export class AttendanceService {
  /**
   * Retrieves attendance records for a specific class on a specific date.
   */
  static async getClassAttendance(schoolId: string, classId: string, date: string) {
    const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
    const q = query(
      collection(db, 'attendance'),
      where('schoolId', '==', schoolId),
      where('class', '==', classId),
      where('date', '==', date),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docData = snap.docs[0];
    return { id: docData.id, ...docData.data() };
  }

  /**
   * Safely updates attendance records (online-first with offline queue fallback).
   */
  static async setAttendanceRecord(
    classAttendanceId: string,
    data: Record<string, unknown>,
    actor?: OfflineActor,
  ) {
    const docRef = doc(db, 'attendance', classAttendanceId);
    if (!actor) {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(docRef, data, { merge: true });
      return { mode: 'online' as const, id: classAttendanceId };
    }
    return safeFirestoreSet(docRef, data, {
      module: 'attendance',
      actor,
      deterministicDocId: classAttendanceId,
    }, { merge: true });
  }

  /**
   * Aggregates student attendance for dashboards safely.
   */
  static async getStudentAttendanceSummary(schoolId: string, classId: string, studentId: string) {
    const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
    const q = query(
      collection(db, 'attendance'),
      where('schoolId', '==', schoolId),
      where('class', '==', classId),
      limit(90),
    );
    const snap = await getDocs(q);

    let absent = 0;
    let late = 0;

    snap.docs.forEach((docSnap) => {
      const records = docSnap.data().records || {};
      if (records[studentId] === 'absent') absent++;
      if (records[studentId] === 'late') late++;
    });

    return { absent, late, totalDays: snap.size };
  }
}
