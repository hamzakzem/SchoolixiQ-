import { collection, query, where, getDocs, doc, getDoc, limit, updateDoc, addDoc, orderBy, startAfter } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface GetStudentsOptions {
  schoolId: string;
  classId?: string;
  limitCount?: number;
  lastDoc?: any;
}

export class StudentService {
  static async getStudents({ schoolId, classId, limitCount = 50, lastDoc }: GetStudentsOptions) {
    let q = query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId)
    );

    if (classId) {
      q = query(q, where('class', '==', classId));
    }

    // Usually ordering is needed for pagination, assuming createdAt
    // q = query(q, orderBy('createdAt', 'desc'));

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    q = query(q, limit(limitCount));

    const snapshot = await getDocs(q);
    const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    return { documents, lastVisible };
  }

  static async getStudentById(studentId: string) {
    const docRef = doc(db, 'students', studentId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() };
  }

  static async updateStudent(studentId: string, data: any) {
    const docRef = doc(db, 'students', studentId);
    await updateDoc(docRef, data);
  }

  static async createStudent(data: any) {
    const docRef = await addDoc(collection(db, 'students'), data);
    return { id: docRef.id, ...data };
  }
}
