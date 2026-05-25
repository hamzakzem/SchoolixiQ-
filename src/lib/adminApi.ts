import { auth } from './firebase';

export async function adminCreateUser(userData: {
  email: string;
  password?: string;
  displayName: string;
  role: string;
  schoolId: string;
  additionalData?: any;
}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('No auth token available');

  const response = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    let errorMessage = 'Failed to create user';
    const responseClone = response.clone();
    try {
      const error = await response.json();
      errorMessage = error.message || error.error || errorMessage;
    } catch (e) {
      // If not JSON, get the text content
      try {
        const text = await responseClone.text();
        console.error('Server returned non-JSON error:', text);
        errorMessage = `Server Error (${response.status}): ${text.substring(0, 100)}...`;
      } catch (textErr) {
        errorMessage = `Failed to create user (Status ${response.status})`;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function adminDeleteUser(uid: string) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('No auth token available');

  const response = await fetch('/api/admin/delete-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ uid })
  });

  if (!response.ok) {
    let errorMessage = 'Failed to delete user';
    const responseClone = response.clone();
    try {
      const error = await response.json();
      errorMessage = error.message || error.error || errorMessage;
    } catch (e) {
      try {
        const text = await responseClone.text();
        console.error('Server returned non-JSON error:', text);
        errorMessage = `Server Error (${response.status}): ${text.substring(0, 100)}...`;
      } catch (textErr) {
        errorMessage = `Failed to delete user (Status ${response.status})`;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function adminDeleteStudent(id: string) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('No auth token available');

  const response = await fetch('/api/admin/delete-student', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ id })
  });

  if (!response.ok) {
    let errorMessage = 'Failed to delete student';
    const responseClone = response.clone();
    try {
      const error = await response.json();
      errorMessage = error.message || error.error || errorMessage;
    } catch (e) {
      try {
        const text = await responseClone.text();
        console.error('Server returned non-JSON error:', text);
        errorMessage = `Server Error (${response.status}): ${text.substring(0, 100)}...`;
      } catch (textErr) {
        errorMessage = `Failed to delete student (Status ${response.status})`;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
