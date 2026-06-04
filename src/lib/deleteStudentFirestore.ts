import {
  doc,
  getDoc,
  runTransaction,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';

/** Client-side delete when admin API is unreachable (rules require students_edit). */
export async function deleteStudentFirestore(
  studentId: string,
  schoolId: string,
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const studentRef = doc(db, 'students', studentId);
    const studentSnap = await transaction.get(studentRef);
    if (!studentSnap.exists()) {
      throw new Error('الطالب غير موجود');
    }
    const data = studentSnap.data();
    if (data.schoolId && data.schoolId !== schoolId) {
      throw new Error('غير مسموح بحذف طالب من مدرسة أخرى');
    }

    transaction.delete(studentRef);

    const userRef = doc(db, 'users', studentId);
    const userSnap = await transaction.get(userRef);
    if (userSnap.exists()) {
      transaction.delete(userRef);
    }

    if (schoolId) {
      transaction.update(doc(db, 'schools', schoolId), {
        studentCount: increment(-1),
      });
    }
  });
}
