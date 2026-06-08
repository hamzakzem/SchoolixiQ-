import { auth } from './firebase';
import {
  BACKEND_NOT_CONFIGURED_MESSAGE,
  getApiUrl,
  getBackendApiBaseUrl,
  isProductionWebBrowser,
  isSchoolixFrontendHost,
  logBackendResolutionStatus,
  requiresRemoteBackend,
} from './apiUtils';

export const API_BACKEND_DISCONNECTED_MESSAGE =
  'خادم الواجهة البرمجية غير متصل. تعذر الوصول إلى خادم إنشاء الحسابات. يرجى المحاولة لاحقاً أو التواصل مع الدعم الفني.';

async function logApiDebug(url: string, response: Response, bodyPreview = '') {
  const headersObj: Record<string, string> = {};
  response.headers.forEach((value, name) => {
    headersObj[name] = value;
  });

  console.error('[API DEBUG INFO]', {
    url,
    status: response.status,
    statusText: response.statusText,
    headers: headersObj,
    bodySummary: bodyPreview.length > 500 ? `${bodyPreview.substring(0, 500)}...` : bodyPreview,
  });
}

function assertBackendReachable(endpoint: string): void {
  logBackendResolutionStatus('adminApi:pre-request', endpoint);

  if (!requiresRemoteBackend(endpoint)) return;

  const backendBase = getBackendApiBaseUrl();
  const absoluteUrl = getApiUrl(endpoint);

  if (isProductionWebBrowser()) {
    if (!backendBase) {
      throw new Error(BACKEND_NOT_CONFIGURED_MESSAGE);
    }
    if (absoluteUrl.startsWith('/') || isSchoolixFrontendHost(absoluteUrl)) {
      throw new Error(API_BACKEND_DISCONNECTED_MESSAGE);
    }
  }
}

function isHtmlLikeResponse(contentType: string | null, text: string): boolean {
  if (contentType && contentType.includes('text/html')) return true;
  const trimmed = text.trim().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
}

async function adminApiPost(endpoint: string, body: Record<string, unknown>) {
  assertBackendReachable(endpoint);

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('No auth token available');

  const absoluteUrl = getApiUrl(endpoint);
  console.info('[API BACKEND STATUS] adminApi:fetch', {
    endpoint,
    method: 'POST',
    target: absoluteUrl.split('?')[0],
    hasBackendBase: Boolean(getBackendApiBaseUrl()),
  });

  const response = await fetch(absoluteUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type');
  const responseText = await response.text();
  const isJson = Boolean(contentType && contentType.includes('application/json'));

  if (isHtmlLikeResponse(contentType, responseText)) {
    await logApiDebug(absoluteUrl, response, responseText);
    throw new Error(API_BACKEND_DISCONNECTED_MESSAGE);
  }

  let json: Record<string, unknown> | null = null;
  if (isJson && responseText) {
    try {
      json = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      (json?.message as string) ||
      (json?.error as string) ||
      `Server Error (${response.status})`;
    throw new Error(errorMessage);
  }

  if (!json) {
    await logApiDebug(absoluteUrl, response, responseText);
    throw new Error(API_BACKEND_DISCONNECTED_MESSAGE);
  }

  return json;
}

export async function adminCreateUser(userData: {
  email: string;
  password?: string;
  displayName: string;
  role: string;
  schoolId: string;
  additionalData?: Record<string, unknown>;
}) {
  const endpoint = `/api/admin/create-user?t=${Date.now()}`;
  const json = await adminApiPost(endpoint, userData);

  const data = (json.data as Record<string, unknown> | undefined) || json;
  return {
    success: json.success !== false,
    message: (json.message as string) || '',
    uid: (data?.uid as string) || (json.uid as string) || '',
    data,
  };
}

export async function adminDeleteUser(uid: string) {
  const endpoint = `/api/admin/delete-user?t=${Date.now()}`;
  const json = await adminApiPost(endpoint, { uid });
  const data = (json.data as Record<string, unknown> | undefined) || json;

  return {
    success: json.success !== false,
    message: (json.message as string) || '',
    dataType: 'user',
    data,
  };
}

export async function adminDeleteStudent(id: string) {
  const endpoint = `/api/admin/delete-student?t=${Date.now()}`;
  const json = await adminApiPost(endpoint, { id });
  const data = (json.data as Record<string, unknown> | undefined) || json;

  return {
    success: json.success !== false,
    message: (json.message as string) || '',
    dataType: 'student',
    data,
  };
}
