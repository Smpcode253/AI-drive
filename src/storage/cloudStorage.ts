import { storage } from '../config/firebase';

const SIGNED_URL_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export interface UploadMetadata {
  contentType: string;
  [key: string]: string;
}

/**
 * Upload a video file buffer to Cloud Storage and return the GCS path.
 */
export async function uploadVideo(
  filePath: string,
  buffer: Buffer,
  metadata: UploadMetadata,
): Promise<string> {
  const bucket = storage.bucket();
  const file = bucket.file(filePath);
  await file.save(buffer, { metadata, resumable: false });
  return filePath;
}

/**
 * Upload an image file buffer to Cloud Storage and return the GCS path.
 */
export async function uploadImage(
  filePath: string,
  buffer: Buffer,
  metadata: UploadMetadata,
): Promise<string> {
  const bucket = storage.bucket();
  const file = bucket.file(filePath);
  await file.save(buffer, { metadata, resumable: false });
  return filePath;
}

/**
 * Generate a short-lived signed download URL for a stored file.
 */
export async function getDownloadUrl(filePath: string): Promise<string> {
  const bucket = storage.bucket();
  const file = bucket.file(filePath);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: new Date(Date.now() + SIGNED_URL_EXPIRY_MS),
  });
  return url;
}

/**
 * Delete a file from Cloud Storage.
 */
export async function deleteFile(filePath: string): Promise<void> {
  const bucket = storage.bucket();
  await bucket.file(filePath).delete();
}

export default { uploadVideo, uploadImage, getDownloadUrl, deleteFile };
