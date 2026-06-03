import { deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { adminDeleteUser } from './adminApi';

/** Reject a school subscription request and remove auth + related Firestore data. */
export async function rejectSchoolRegistrationRequest(request: {
  id: string;
  _source?: string;
  uid?: string;
  schoolId?: string;
}): Promise<void> {
  const source = request._source || 'registrations';

  if (request.schoolId) {
    try {
      await deleteDoc(doc(db, 'schools', request.schoolId));
    } catch (e) {
      console.warn('Failed to delete school on reject:', e);
    }
  }

  if (request.uid) {
    try {
      await adminDeleteUser(request.uid);
    } catch (e) {
      console.warn('Failed to delete auth user on reject:', e);
    }
    try {
      await deleteDoc(doc(db, 'users', request.uid));
    } catch (e) {
      console.warn('Failed to delete users doc on reject:', e);
    }
  }

  try {
    await updateDoc(doc(db, source, request.id), {
      status: 'rejected',
      rejectedAt: serverTimestamp(),
    });
  } catch {
    // doc may already be gone
  }

  try {
    await deleteDoc(doc(db, source, request.id));
  } catch (e) {
    console.warn('Failed to delete registration request:', e);
  }
}
