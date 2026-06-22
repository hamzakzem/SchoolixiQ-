import { doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  safeFirestoreAdd,
  safeFirestoreUpdate,
} from '../lib/offline/offlineSync';
import type { OfflineActor } from '../lib/offline/offlineTypes';

export interface GetStudentsOptions {
  schoolId: string;
  classId?: string;
  limitCount?: number;
  lastDoc?: unknown;
}

export class StudentService {
  static async getStudents({ schoolId, classId, limitCount = 50, lastDoc }: GetStudentsOptions) {
    const { collection, query, where, getDocs, limit, startAfter } = await import('firebase/firestore');
    let q = query(collection(db, 'students'), where('schoolId', '==', schoolId));

    if (classId) {
      q = query(q, where('class', '==', classId));
    }

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    q = query(q, limit(limitCount));

    const snapshot = await getDocs(q);
    const documents = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    return { documents, lastVisible };
  }

  static async getStudentById(studentId: string) {
    const { getDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'students', studentId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() };
  }

  static async updateStudent(studentId: string, data: Record<string, unknown>, actor?: OfflineActor) {
    const docRef = doc(db, 'students', studentId);
    if (!actor) {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(docRef, data);
      return { mode: 'online' as const, id: studentId };
    }
    return safeFirestoreUpdate(docRef, data, { module: 'students', actor });
  }

  static async createStudent(data: Record<string, unknown>, actor?: OfflineActor) {
    if (!actor) {
      const { addDoc, collection } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'students'), data);
      return { mode: 'online' as const, id: docRef.id, ...data };
    }
    const result = await safeFirestoreAdd('students', data, { module: 'students', actor });
    return { mode: result.mode, id: result.id, ...data };
  }
}
