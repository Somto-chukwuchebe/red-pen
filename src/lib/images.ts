// Photos from the phone camera are several MB each. Shrinking them keeps backups and
// sync files small; 1600 px is still sharp enough to read a whiteboard.

export const PHOTO_MAX_SIDE = 1600;

/** A smaller JPEG copy of a photo, or the original file if the browser can't read it. */
export async function shrinkPhoto(file: Blob, maxSide = PHOTO_MAX_SIDE, quality = 0.8): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file); // also turns iPhone photos the right way up
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const small = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return small && small.size < file.size ? small : file;
  } catch {
    return file;
  }
}
