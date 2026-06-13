import { getApiUrl, ensureBackendApiBaseUrl } from './apiUtils';
import { auth, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function logStorageStart(meta: {
  path: string;
  contentType: string;
  size: number;
}) {
  console.info('[Storage] UPLOAD_START', {
    path: meta.path,
    contentType: meta.contentType,
    size: meta.size,
  });
}

function logStorageSuccess(meta: {
  path: string;
  contentType: string;
  size: number;
  url: string;
}) {
  console.info('[Storage] UPLOAD_SUCCESS', {
    path: meta.path,
    contentType: meta.contentType,
    size: meta.size,
    url: meta.url,
  });
}

function logStorageError(meta: {
  path: string;
  contentType: string;
  size: number;
  code?: string;
  message: string;
}) {
  console.error('[Storage] UPLOAD_ERROR', {
    path: meta.path,
    contentType: meta.contentType,
    size: meta.size,
    code: meta.code ?? '(no code)',
    message: meta.message,
  });
}

function storageErrorCode(error: unknown): string | undefined {
  const err = error as { code?: string };
  return err?.code;
}

function storageErrorMessage(error: unknown): string {
  const err = error as { message?: string };
  return err?.message || String(error);
}

export const compressImageToBase64 = (
  file: File,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.8,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

function resolveImageExtension(filename: string, mimeType?: string): string {
  const fromName = filename.match(/\.(jpe?g|png|webp)$/i)?.[0]?.toLowerCase();
  if (fromName) {
    return fromName === '.jpeg' ? '.jpg' : fromName;
  }
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
}

function normalizePathForJpegUpload(storagePath: string): string {
  return storagePath.replace(/\.(png|webp|jpe?g)$/i, '.jpg');
}

async function ensureAuthReadyForUpload(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }
  await user.getIdToken(true);
}

export const compressImage = (
  file: File,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.8,
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create blob'));
              }
            },
            'image/jpeg',
            quality,
          );
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

/** Shared client Storage upload with server fallback (Cloud Run on production web). */
export async function uploadImageViaStorageOrServer(
  file: File,
  storagePath: string,
  maxWidth = 400,
  maxHeight = 400,
): Promise<string> {
  await ensureAuthReadyForUpload();

  const blob = await compressImage(file, maxWidth, maxHeight);
  const contentType = 'image/jpeg';
  const uploadPath = normalizePathForJpegUpload(storagePath);
  const size = blob.size;

  logStorageStart({ path: uploadPath, contentType, size });

  try {
    const storageRef = ref(storage, uploadPath);
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType,
      customMetadata: {
        uploadedBy: auth.currentUser?.uid || '',
      },
    });
    const url = await getDownloadURL(snapshot.ref);
    logStorageSuccess({ path: uploadPath, contentType, size, url });
    return url;
  } catch (clientError) {
    logStorageError({
      path: uploadPath,
      contentType,
      size,
      code: storageErrorCode(clientError),
      message: storageErrorMessage(clientError),
    });
    console.warn(
      '[Storage] Client upload failed, trying server upload:',
      clientError,
    );
    return uploadImageToServer(file, uploadPath, maxWidth, maxHeight);
  }
}

export function buildSchoolLogoPath(
  schoolId: string,
  filename: string,
  mimeType?: string,
): string {
  if (!schoolId?.trim()) {
    throw new Error('INVALID_SCHOOL_ID');
  }
  const ext = resolveImageExtension(filename, mimeType);
  return `schools/${schoolId.trim()}/logo/logo_${Date.now()}${ext}`;
}

/** Upload school logo to Storage (school-scoped path). */
export async function uploadSchoolLogo(file: File, schoolId: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('INVALID_IMAGE_TYPE');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('FILE_TOO_LARGE');
  }
  const path = buildSchoolLogoPath(schoolId, file.name, file.type);
  return uploadImageViaStorageOrServer(file, path, 400, 400);
}

/** School-scoped student photo path matching storage.rules */
export function buildStudentPhotoPath(
  schoolId: string,
  studentId: string,
  filename = '',
  mimeType?: string,
): string {
  const safeId = studentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!schoolId?.trim() || !safeId || safeId === 'new' || safeId === 'undefined') {
    throw new Error('INVALID_STUDENT_ID');
  }
  const ext = resolveImageExtension(filename, mimeType);
  return `students/${schoolId}/${safeId}/photo_${Date.now()}${ext}`;
}

/** Upload student photo via Firebase Storage, falling back to server /api/upload. */
export async function uploadStudentPhoto(
  file: File,
  schoolId: string,
  studentId: string,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('INVALID_IMAGE_TYPE');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('FILE_TOO_LARGE');
  }

  const path = buildStudentPhotoPath(schoolId, studentId, file.name, file.type);
  return uploadImageViaStorageOrServer(file, path, 400, 400);
}

export const uploadImageToServer = async (
  file: File,
  storagePath: string,
  maxWidth = 400,
  maxHeight = 400,
): Promise<string> => {
  await ensureAuthReadyForUpload();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const uploadPath = normalizePathForJpegUpload(storagePath);
  const contentType = 'image/jpeg';

  logStorageStart({
    path: uploadPath,
    contentType,
    size: file.size,
  });

  try {
    const base64 = await compressImageToBase64(file, maxWidth, maxHeight);
    const token = await user.getIdToken();
    const backendBase = await ensureBackendApiBaseUrl();
    const uploadUrl = backendBase
      ? `${backendBase.replace(/\/$/, '')}/api/upload`
      : getApiUrl('/api/upload');

    if (isProductionWebUploadWithoutBackend(uploadUrl, backendBase)) {
      throw new Error('UPLOAD_BACKEND_UNAVAILABLE');
    }

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ path: uploadPath, base64 }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData.message ||
        errorData.error ||
        `Failed to upload image (${response.status})`;
      throw Object.assign(new Error(message), {
        code: errorData.error || `HTTP_${response.status}`,
      });
    }
    const data = await response.json();
    if (!data?.url) {
      throw new Error('UPLOAD_NO_URL');
    }
    logStorageSuccess({
      path: uploadPath,
      contentType,
      size: file.size,
      url: data.url,
    });
    return data.url;
  } catch (error) {
    logStorageError({
      path: uploadPath,
      contentType,
      size: file.size,
      code: storageErrorCode(error),
      message: storageErrorMessage(error),
    });
    throw error;
  }
};

function isProductionWebUploadWithoutBackend(
  uploadUrl: string,
  backendBase: string,
): boolean {
  if (backendBase) return false;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  const isProdHost =
    host === 'schoolixiq.com' ||
    host.endsWith('.schoolixiq.com') ||
    host.includes('hostinger');
  return isProdHost && uploadUrl.startsWith('/');
}
