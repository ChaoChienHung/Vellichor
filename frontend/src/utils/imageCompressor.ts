/**
 * Utility to process, scale and compress images on the client side.
 * Converts images to compact WebP/JPEG Base64 Data URLs so they can be
 * safely encrypted inside the AES-GCM diary entry without leaking unencrypted files.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  name: string;
}

export async function compressImage(
  file: File | Blob,
  maxDimension: number = 1400,
  quality: number = 0.82
): Promise<CompressionResult> {
  const fileName = (file as File).name || 'image.jpg';
  const originalSize = file.size;

  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('選取的檔案不是有效的相片格式');
  }

  // Reject files that are excessively large (> 25MB) before processing
  if (originalSize > 25 * 1024 * 1024) {
    throw new Error('相片檔案過大（超過 25MB），請選擇較小的相片。');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('讀取相片失敗，請重試。'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('解析相片資料失敗，請確認檔案格式是否損毀。'));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scaling down to maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('瀏覽器不支援 Canvas 圖像處理。'));
          return;
        }

        // Draw image with high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer image/jpeg for highest compatibility with standard data URL schemas
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const compressedSize = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
          width,
          height,
          name: fileName,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
