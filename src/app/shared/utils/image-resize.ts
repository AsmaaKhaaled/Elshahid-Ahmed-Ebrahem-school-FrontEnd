export const MAX_PHOTO_UPLOAD_MB = 5;
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Center-crops an image file to a square and scales it down to `size` px,
 * returning a compressed JPEG data URL (~20-40 KB for a 320px avatar),
 * so large phone photos don't slow down the pages that display them.
 */
export async function resizeImageToSquare(file: File, size = 320, quality = 0.85): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.min(size, side);

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      canvas.width,
      canvas.height
    );
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    bitmap.close();
  }
}

/**
 * Scales an image file down so its longer side is at most `maxSide` px, keeping its shape,
 * and returns a compressed JPEG data URL (for wide photos such as the home page carousel).
 */
export async function resizeImage(file: File, maxSide = 1600, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    bitmap.close();
  }
}
