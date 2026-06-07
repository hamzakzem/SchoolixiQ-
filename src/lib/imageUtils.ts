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

/** School-scoped student photo path matching storage.rules */
export function buildStudentPhotoPath(
  schoolId: string,
  studentId: string,
  filename = '',
  mimeType?: string,
): string {
  const safeId = studentId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'new';
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

  let clientError: unknown;
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/jpeg',
    });
    return getDownloadURL(snapshot.ref);
  } catch (error) {
    clientError = error;
    console.warn('Client student photo upload failed, trying same-origin server upload:', error);
  }

  try {
    return await uploadImageToServer(file, path, 400, 400);
  } catch (serverError) {
    console.error('Server student photo upload failed:', serverError, clientError);
    throw serverError;
  }
}

export const uploadImageToServer = async (file: File, storagePath: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
  const base64 = await compressImageToBase64(file, maxWidth, maxHeight);
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(getApiUrl('/api/upload'), {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ path: storagePath, base64 })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload image to server');
  }
  const data = await response.json();
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
