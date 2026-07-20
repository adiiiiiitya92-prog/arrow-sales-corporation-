export type CompressionCategory = 'document' | 'site_photo' | 'thumbnail';

export interface CompressionOptions {
  category?: CompressionCategory;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface CompressionResult {
  dataUrl: string;
  blob: Blob;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatioPercent: number;
  fileName: string;
}

/**
 * Client-Side Ultra Image Compressor
 * Converts raw smartphone photos (3-8 MB JPEGs) into ultra-lightweight WebP images (~30-60 KB)
 */
export async function compressImage(
  input: File | Blob | string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const category = options.category || 'site_photo';

  // Smart Adaptive Tier Settings
  let maxWidth = options.maxWidth;
  let maxHeight = options.maxHeight;
  let quality = options.quality;

  if (maxWidth === undefined || maxHeight === undefined || quality === undefined) {
    switch (category) {
      case 'document':
        // High resolution for text readability (Aadhaar, PAN, Electricity Bill)
        maxWidth = maxWidth ?? 1600;
        maxHeight = maxHeight ?? 1600;
        quality = quality ?? 0.80; // ~60-80 KB
        break;

      case 'thumbnail':
        maxWidth = maxWidth ?? 400;
        maxHeight = maxHeight ?? 400;
        quality = quality ?? 0.55; // ~10-15 KB
        break;

      case 'site_photo':
      default:
        // Maximum compression for site & installation photos
        maxWidth = maxWidth ?? 1200;
        maxHeight = maxHeight ?? 1200;
        quality = quality ?? 0.65; // ~30-50 KB
        break;
    }
  }

  let originalSizeBytes = 0;
  let fileName = `photo_${Date.now()}.webp`;

  if (input instanceof File) {
    originalSizeBytes = input.size;
    fileName = input.name.replace(/\.[^/.]+$/, '') + '.webp';
  } else if (input instanceof Blob) {
    originalSizeBytes = input.size;
  }

  // Load Image into HTMLImageElement
  const img = await loadImage(input);
  if (!originalSizeBytes) {
    originalSizeBytes = Math.round((img.src.length * 3) / 4); // Approx dataURL byte size
  }

  // Calculate scaled dimensions keeping aspect ratio
  let { width, height } = img;
  if (width > maxWidth || height > maxHeight) {
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const bestRatio = Math.min(widthRatio, heightRatio);
    width = Math.round(width * bestRatio);
    height = Math.round(height * bestRatio);
  }

  // Draw on HTML5 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Smooth canvas scaling quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // Export as compressed WebP (fallback to JPEG if WebP unsupported)
  let mimeType = 'image/webp';
  let dataUrl = canvas.toDataURL(mimeType, quality);
  if (!dataUrl.startsWith('data:image/webp')) {
    mimeType = 'image/jpeg';
    dataUrl = canvas.toDataURL(mimeType, quality);
  }

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (b) => {
        resolve(b || new Blob());
      },
      mimeType,
      quality
    );
  });

  const compressedSizeBytes = blob.size || Math.round((dataUrl.length * 3) / 4);
  const compressionRatioPercent = Math.round(
    ((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100
  );

  console.log(
    `[ImageCompressor] Category: ${category} | Size: ${(originalSizeBytes / 1024).toFixed(1)}KB -> ${(compressedSizeBytes / 1024).toFixed(1)}KB (-${compressionRatioPercent}%)`
  );

  return {
    dataUrl,
    blob,
    originalSizeBytes,
    compressedSizeBytes,
    compressionRatioPercent,
    fileName
  };
}

/**
 * Load input into HTMLImageElement
 */
function loadImage(input: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);

    if (typeof input === 'string') {
      img.src = input;
    } else {
      const url = URL.createObjectURL(input);
      img.src = url;
    }
  });
}
