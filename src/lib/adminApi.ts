import { auth } from './firebase';
import { getApiUrl } from './apiUtils';
import { AppError } from './AppError';

// Helper to log requests and responses for debugging
async function logApiDebug(url: string, response: Response) {
  const headersObj: Record<string, string> = {};
  response.headers.forEach((value, name) => {
    headersObj[name] = value;
  });

  let bodyText = '';
  try {
    const responseClone = response.clone();
    bodyText = await responseClone.text();
  } catch (err) {
    bodyText = '[Unreadable body]';
  }

  console.error('[API DEBUG INFO]', {
    url,
    status: response.status,
    statusText: response.statusText,
    headers: headersObj,
    bodySummary: bodyText.length > 500 ? bodyText.substring(0, 500) + '...' : bodyText
  });
}

export async function adminCreateUser(userData: {
  email: string;
  password?: string;
  displayName: string;
  role: string;
  schoolId: string;
  additionalData?: any;
}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new AppError('No auth token available', {
      code: 'auth/no-token',
      source: 'auth',
    });
  }

  const endpoint = `/api/admin/create-user?t=${Date.now()}`;
  const absoluteUrl = getApiUrl(endpoint);

  const response = await fetch(absoluteUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!isJson) {
    await logApiDebug(absoluteUrl, response);
  }

  if (!response.ok) {
    let errorMessage = 'Failed to create user';
    try {
      if (isJson) {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } else {
        const responseClone = response.clone();
        const text = await responseClone.text();
        errorMessage = `Server Error (${response.status}): ${text.substring(0, 100)}...`;
      }
    } catch (e) {
      errorMessage = `Failed to create user (Status ${response.status})`;
    }
    throw AppError.fromApi(errorMessage, response.status);
  }

  if (isJson) {
    const json = await response.json();
    return {
      success: json.success !== false,
      message: json.message || '',
      uid: json.data?.uid || json.uid || '',
      data: json.data || json
    };
  } else {
    const responseClone = response.clone();
    let text = '';
    try {
      text = await responseClone.text();
    } catch (_) {}
    throw AppError.fromApi(
      `Server returned non-JSON response (Status ${response.status}): ${text.substring(0, 80)}...`,
      response.status,
      'api/non-json-response',
    );
  }
}

export async function adminDeleteUser(uid: string) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new AppError('No auth token available', {
      code: 'auth/no-token',
      source: 'auth',
    });
  }

  const endpoint = `/api/admin/delete-user?t=${Date.now()}`;
  const absoluteUrl = getApiUrl(endpoint);

  const response = await fetch(absoluteUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ uid })
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!isJson) {
    await logApiDebug(absoluteUrl, response);
  }

  if (!response.ok) {
    let errorMessage = 'Failed to delete user';
    try {
      if (isJson) {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } else {
        const responseClone = response.clone();
        const text = await responseClone.text();
        errorMessage = `Server Error (${response.status}): ${text.substring(0, 100)}...`;
      }
    } catch (e) {
      errorMessage = `Failed to delete user (Status ${response.status})`;
    }
    throw AppError.fromApi(errorMessage, response.status);
  }

  if (isJson) {
    const json = await response.json();
    return {
      success: json.success !== false,
      message: json.message || '',
      dataType: 'user',
      data: json.data || json
    };
  } else {
    const responseClone = response.clone();
    let text = '';
    try {
      text = await responseClone.text();
    } catch (_) {}
    throw AppError.fromApi(
      `Server returned non-JSON response (Status ${response.status}): ${text.substring(0, 80)}...`,
      response.status,
      'api/non-json-response',
    );
  }
}

export async function adminDeleteStudent(id: string) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new AppError('No auth token available', {
      code: 'auth/no-token',
      source: 'auth',
    });
  }

  const endpoint = `/api/admin/delete-student?t=${Date.now()}`;
  const absoluteUrl = getApiUrl(endpoint);

  const response = await fetch(absoluteUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ id })
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!isJson) {
    await logApiDebug(absoluteUrl, response);
  }

  if (!response.ok) {
    let errorMessage = 'Failed to delete student';
    try {
      if (isJson) {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } else {
        const responseClone = response.clone();
        const text = await responseClone.text();
        errorMessage = `Server Error (${response.status}): ${text.substring(0, 100)}...`;
      }
    } catch (e) {
      errorMessage = `Failed to delete student (Status ${response.status})`;
    }
    throw AppError.fromApi(errorMessage, response.status);
  }

  if (isJson) {
    const json = await response.json();
    return {
      success: json.success !== false,
      message: json.message || '',
      dataType: 'student',
      data: json.data || json
    };
  } else {
    const responseClone = response.clone();
    let text = '';
    try {
      text = await responseClone.text();
    } catch (_) {}
    throw AppError.fromApi(
      `Server returned non-JSON response (Status ${response.status}): ${text.substring(0, 80)}...`,
      response.status,
      'api/non-json-response',
    );
  }
}
