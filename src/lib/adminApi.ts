import { auth } from './firebase';
import {
  BACKEND_NOT_CONFIGURED_MESSAGE,
  ensureBackendApiBaseUrl,
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

async function assertBackendReachable(endpoint: string): Promise<void> {
  if (!requiresRemoteBackend(endpoint)) return;

  const backendBase = await ensureBackendApiBaseUrl();
  logBackendResolutionStatus('adminApi:pre-request', endpoint);

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
  await assertBackendReachable(endpoint);

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('No auth token available');

  const absoluteUrl = getApiUrl(endpoint);
  const backendBase = getBackendApiBaseUrl();

  if (isProductionWebBrowser() && (!backendBase || absoluteUrl.startsWith('/'))) {
    throw new Error(BACKEND_NOT_CONFIGURED_MESSAGE);
  }

  console.info('[API BACKEND STATUS] adminApi:fetch', {
    endpoint,
    method: 'POST',
    target: absoluteUrl.split('?')[0],
    hasBackendBase: Boolean(backendBase),
    resolvedBase: backendBase || null,
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
    const routeMissing =
      response.status === 404 &&
      (!json?.error ||
        json.error === 'Not Found' ||
        String(json.message || '').toLowerCase().includes('cannot post'));
    const errorMessage = routeMissing
      ? `مسار API غير متوفر على الخادم (${response.status}). يلزم نشر backend محدّث.`
      : (json?.message as string) ||
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

export async function adminDeleteUser(
  userId: string,
  options?: {
    confirmSuperAdminDelete?: boolean;
    confirmSelfDelete?: boolean;
  },
) {
  const endpoint = `/api/admin/delete-user?t=${Date.now()}`;
  const json = await adminApiPost(endpoint, {
    userId,
    uid: userId,
    confirmSuperAdminDelete: options?.confirmSuperAdminDelete === true,
    confirmSelfDelete: options?.confirmSelfDelete === true,
  });
  const data = (json.data as Record<string, unknown> | undefined) || json;

  return {
    success: json.success !== false && json.ok !== false,
    message: (json.message as string) || '',
    deletedAuth: Boolean(json.deletedAuth),
    deletedFirestoreUser: Boolean(json.deletedFirestoreUser),
    warnings: Array.isArray(json.warnings) ? (json.warnings as string[]) : [],
    dataType: 'user',
    data,
  };
}

export async function adminSyncUserClaims(uid: string) {
  const endpoint = `/api/admin/sync-claims?t=${Date.now()}`;
  const json = await adminApiPost(endpoint, { uid });
  return {
    success: json.success !== false,
    message: (json.message as string) || '',
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

export async function adminApplyDistributorCoupon(schoolId: string, couponCode: string) {
  const json = await adminApiPost('/api/admin/distributors/apply-coupon', {
    schoolId,
    couponCode,
  });
  return json;
}

export async function adminValidateDistributorCoupon(couponCode: string) {
  const json = await adminApiPost('/api/admin/distributors/validate-coupon', {
    couponCode,
  });
  return json as {
    ok: boolean;
    code: string;
    distributorId: string;
    distributorName: string;
    discountPercent: number;
    commissionPercent: number;
  };
}

export async function adminFinalizeSchoolTracking(
  schoolId: string,
  couponCode?: string | null,
) {
  const json = await adminApiPost(
    `/api/admin/schools/${encodeURIComponent(schoolId)}/finalize-tracking`,
    couponCode ? { couponCode } : {},
  );
  return json;
}

/** Accrue distributor commission after super-admin payment confirmation. */
export async function adminAccrueCommissionOnPaymentConfirmed(
  schoolId: string,
  monthKey?: string,
) {
  const json = await adminApiPost(
    `/api/admin/schools/${encodeURIComponent(schoolId)}/confirm-payment-commission`,
    monthKey ? { monthKey } : {},
  );
  return json as {
    ok?: boolean;
    created: boolean;
    alreadyExists?: boolean;
    commissionId?: string;
    monthKey?: string;
    commissionAmount?: number;
    reason?: string;
  };
}

export async function adminGenerateMonthlyCommissions(monthKey: string) {
  const json = await adminApiPost('/api/admin/distributors/generate-monthly-commissions', {
    monthKey,
  });
  return json as {
    ok?: boolean;
    generated: number;
    skippedInactive: number;
    skippedUnpaid: number;
    alreadyExists: number;
    monthKey: string;
  };
}

export async function adminMarkCommissionPaid(commissionId: string, notes?: string) {
  const json = await adminApiPost(
    `/api/admin/distributors/commissions/${encodeURIComponent(commissionId)}/mark-paid`,
    notes ? { notes } : {},
  );
  return json;
}

export async function adminMarkDistributorMonthPaid(
  distributorId: string,
  monthKey: string,
  notes?: string,
) {
  const json = await adminApiPost(
    `/api/admin/distributors/${encodeURIComponent(distributorId)}/commissions/mark-paid`,
    notes ? { monthKey, notes } : { monthKey },
  );
  return json;
}

export async function adminSetSchoolDistributorCommissionPaused(
  schoolId: string,
  paused: boolean,
) {
  const json = await adminApiPost(
    `/api/admin/schools/${encodeURIComponent(schoolId)}/distributor-commission-pause`,
    { paused },
  );
  return json;
}

export async function adminApproveDistributor(distributorId: string, password?: string) {
  const json = await adminApiPost('/api/admin/distributors/approve', {
    distributorId,
    ...(password ? { password } : {}),
  });
  return json as {
    ok?: boolean;
    distributorId: string;
    userId?: string | null;
    userCreated?: boolean;
    needsEmailForLogin?: boolean;
    alreadyActive?: boolean;
  };
}

export async function adminRejectDistributor(distributorId: string, reason?: string) {
  const json = await adminApiPost('/api/admin/distributors/reject', {
    distributorId,
    ...(reason ? { reason } : {}),
  });
  return json;
}

export async function adminListPendingDistributors() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('No auth token available');
  const response = await fetch(getApiUrl('/api/admin/distributors/pending'), {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Authorization': `Bearer ${token}`,
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(String(json.message || json.error || 'Failed to load pending distributors'));
  }
  return json as { items: Record<string, unknown>[] };
}

/** Super Admin only — permanently purge all chat data for a user. */
export async function adminPurgeUserConversations(
  targetUserId: string,
  confirm: 'DELETE',
) {
  const json = await adminApiPost('/api/admin/messages/purge-user-conversations', {
    targetUserId,
    confirm,
  });
  return json;
}

/** Super Admin only — hard-delete a system_messages document via Admin SDK. */
export async function adminPermanentDeleteMessage(messageId: string) {
  const json = await adminApiPost('/api/admin/messages/permanent-delete', {
    messageId,
  });
  return json;
}

export type StartConversationResult = {
  success?: boolean;
  ok?: boolean;
  conversationId: string;
  conversationKey: string;
  contactType: string;
  contactId: string;
  contactName?: string;
  schoolId?: string | null;
  distributorId?: string | null;
  created?: boolean;
};

export async function startPlatformConversation(
  contactType: string,
  contactId: string,
): Promise<StartConversationResult> {
  const json = await adminApiPost('/api/messages/start-conversation', {
    contactType,
    contactId,
  });
  return json as StartConversationResult;
}
