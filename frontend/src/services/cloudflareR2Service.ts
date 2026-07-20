/**
 * Cloudflare R2 Storage & Upload Service
 * 10 GB Free Tier Forever | 0 Egress Bandwidth Fees
 */

export interface R2UploadOptions {
  path?: string;
  contentType?: string;
}

export interface R2UploadResult {
  url: string;
  key: string;
  isCloudflareR2: boolean;
  sizeBytes: number;
}

const R2_ACCOUNT_ID = import.meta.env.VITE_CLOUDFLARE_R2_ACCOUNT_ID || '';
const R2_BUCKET_NAME = import.meta.env.VITE_CLOUDFLARE_R2_BUCKET_NAME || 'solar-crm-assets';
const R2_PUBLIC_URL = import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL || '';
const R2_WORKER_URL = import.meta.env.VITE_CLOUDFLARE_R2_WORKER_URL || '';

/**
 * Upload compressed file to Cloudflare R2 Storage
 * If offline or R2 worker endpoint is not configured, returns Local Blob DataURL gracefully.
 */
export async function uploadToCloudflareR2(
  fileOrBlob: Blob | File | string,
  fileName: string,
  options: R2UploadOptions = {}
): Promise<R2UploadResult> {
  const contentType = options.contentType || 'image/webp';
  const folderPath = options.path || 'uploads';
  const fileKey = `${folderPath}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  // If input is dataUrl string, convert to Blob
  let blob: Blob;
  if (typeof fileOrBlob === 'string') {
    blob = dataURLToBlob(fileOrBlob);
  } else {
    blob = fileOrBlob;
  }

  const sizeBytes = blob.size;

  // Check if Cloudflare Worker URL or S3 Presigned URL is configured
  if (R2_WORKER_URL && navigator.onLine) {
    try {
      const uploadEndpoint = `${R2_WORKER_URL.replace(/\/$/, '')}/upload?key=${encodeURIComponent(fileKey)}`;
      const response = await fetch(uploadEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        },
        body: blob
      });

      if (response.ok) {
        const json = await response.json().catch(() => ({}));
        const publicUrl = json.url || `${R2_PUBLIC_URL}/${fileKey}`;
        console.log(`[CloudflareR2] Uploaded successfully to R2: ${publicUrl}`);
        return {
          url: publicUrl,
          key: fileKey,
          isCloudflareR2: true,
          sizeBytes
        };
      }
    } catch (err) {
      console.warn('[CloudflareR2] R2 Upload worker request failed, falling back to local storage:', err);
    }
  }

  // Fallback: Convert to WebP DataURL string for Dexie local storage
  const localDataUrl = await blobToDataURL(blob);
  return {
    url: localDataUrl,
    key: fileKey,
    isCloudflareR2: false,
    sizeBytes
  };
}

/**
 * Convert DataURL to Blob
 */
function dataURLToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Convert Blob to DataURL
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Utility to check Cloudflare R2 configuration status
 */
export function getCloudflareR2ConfigStatus() {
  return {
    isConfigured: Boolean(R2_WORKER_URL || (R2_ACCOUNT_ID && R2_PUBLIC_URL)),
    bucketName: R2_BUCKET_NAME,
    publicUrl: R2_PUBLIC_URL,
    workerUrl: R2_WORKER_URL
  };
}
