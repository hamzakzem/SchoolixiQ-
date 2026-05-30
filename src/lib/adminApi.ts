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

  const response = await fetch(`/api/admin/create-user?t=${Date.now()}`, {
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
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } else {
        const text = await responseClone.text();
        errorMessage = `Server Error (${response.status}): ${text.substring(0, 100)}...`;
      }
    } catch (e) {
      errorMessage = `Failed to create user (Status ${response.status})`;
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  } else {
    const responseClone = response.clone();
    let text = '';
    try {
      text = await responseClone.text();
    } catch (_) {}
    throw new Error(`Server returned non-JSON response (Status ${response.status}): ${text.substring(0, 80)}...`);
  }
}

export async function adminDeleteUser(uid: string) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('No auth token available');

  const response = await fetch(`/api/admin/delete-user?t=${Date.now()}`, {
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
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } else {
        const text = await responseClone.text();
        errorMessage = `Server Error (${response.status}): ${text.substring(0, 100)}...`;
      }
    } catch (e) {
      errorMessage = `Failed to delete user (Status ${response.status})`;
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  } else {
    const responseClone = response.clone();
    let text = '';
    try {
      text = await responseClone.text();
    } catch (_) {}
    throw new Error(`Server returned non-JSON response (Status ${response.status}): ${text.substring(0, 80)}...`);
  }
}

export async function adminDeleteStudent(id: string) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('No auth token available');

  const response = await fetch(`/api/admin/delete-student?t=${Date.now()}`, {
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
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } else {
        const text = await responseClone.text();
        errorMessage = `Server Error (${response.status}): ${text.substring(0, 100)}...`;
      }
    } catch (e) {
      errorMessage = `Failed to delete student (Status ${response.status})`;
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  } else {
    const responseClone = response.clone();
    let text = '';
    try {
      text = await responseClone.text();
    } catch (_) {}
    throw new Error(`Server returned non-JSON response (Status ${response.status}): ${text.substring(0, 80)}...`);
  }
}
