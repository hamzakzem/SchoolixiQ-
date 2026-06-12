import { getApiUrl } from './apiUtils';
import { auth, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const compressImageToBase64 = (file: File, maxWidth = 400, maxHeight = 400): Promise<string> => {
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
          resolve(canvas.toDataURL('image/jpeg', 0.8));
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

/** Shared client Storage upload with server fallback (Cloud Run on production web). */
export async function uploadImageViaStorageOrServer(
  file: File,
  storagePath: string,
  maxWidth = 400,
  maxHeight = 400,
): Promise<string> {
  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/jpeg',
    });
    return getDownloadURL(snapshot.ref);
  } catch (clientError) {
    console.warn('Client storage upload failed, trying server upload:', clientError);
    return uploadImageToServer(file, storagePath, maxWidth, maxHeight);
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

/** Upload student photo via Firebase Storage, falling back to same-origin /api/upload. */
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

export const uploadImageToServer = async (file: File, storagePath: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }
  const base64 = await compressImageToBase64(file, maxWidth, maxHeight);
  const token = await user.getIdToken();
  const response = await fetch(getApiUrl('/api/upload'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ path: storagePath, base64 }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.message ||
      errorData.error ||
      `Failed to upload image (${response.status})`;
    throw new Error(message);
  }
  const data = await response.json();
  if (!data?.url) {
    throw new Error('UPLOAD_NO_URL');
  }
  return data.url;
};

export const compressImage = (file: File, maxWidth = 400, maxHeight = 400): Promise<Blob> => {
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
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, file.type || 'image/jpeg', 0.8);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
