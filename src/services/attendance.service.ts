import { collection, query, where, getDocs, doc, setDoc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export class AttendanceService {
  /**
   * Retrieves attendance records for a specific class on a specific date.
   */
  static async getClassAttendance(schoolId: string, classId: string, date: string) {
    const classAttendanceId = `${classId}_${date}`;
    const q = query(
      collection(db, 'attendance'),
      where('schoolId', '==', schoolId),
      where('class', '==', classId),
      where('date', '==', date),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docData = snap.docs[0];
    return { id: docData.id, ...docData.data() };
  }

  /**
   * Safely updates attendance records.
   */
  static async setAttendanceRecord(classAttendanceId: string, data: any) {
    const docRef = doc(db, 'attendance', classAttendanceId);
    await setDoc(docRef, data, { merge: true });
  }

  /**
   * Aggregates student attendance for dashboards safely.
   */
  static async getStudentAttendanceSummary(schoolId: string, classId: string, studentId: string) {
    // Only fetche up to 90 days of attendance to prevent cost explosion
    const q = query(
      collection(db, 'attendance'),
      where('schoolId', '==', schoolId),
      where('class', '==', classId),
      limit(90)
    );
    const snap = await getDocs(q);
    
    let absent = 0;
    let late = 0;

    snap.docs.forEach(docSnap => {
      const records = docSnap.data().records || {};
      if (records[studentId] === 'absent') absent++;
      if (records[studentId] === 'late') late++;
    });

    return { absent, late, totalDays: snap.size };
  }
}
