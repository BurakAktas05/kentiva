import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';

export class PhotoCaptureCancelledError extends Error {
  constructor() {
    super('PHOTO_CAPTURE_CANCELLED');
    this.name = 'PhotoCaptureCancelledError';
  }
}

export type CaptureResult = { file: File; previewUrl: string };

/** Rapor fotoğrafı hem kamera hem de galeriden yüklenebilir. */
export async function captureReportPhotoFile(): Promise<CaptureResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        width: 1280,
        height: 1280,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
        direction: CameraDirection.Rear,
        cameraDirection: CameraDirection.Rear,
      });
      if (!photo.webPath) {
        throw new PhotoCaptureCancelledError();
      }
      const previewUrl = photo.webPath;
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
      const file = new File([blob], `report-${Date.now()}.jpg`, { type });
      return { file, previewUrl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('cancel') || msg.includes('Cancel') || msg.includes('User')) {
        throw new PhotoCaptureCancelledError();
      }
      throw err;
    }
  }

  return pickFromCameraInputOnly();
}

function pickFromCameraInputOnly(): Promise<CaptureResult> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        try {
          const compressedFile = await resizeImageWeb(file);
          resolve({ file: compressedFile, previewUrl: URL.createObjectURL(compressedFile) });
        } catch {
          resolve({ file, previewUrl: URL.createObjectURL(file) });
        }
      } else {
        reject(new PhotoCaptureCancelledError());
      }
    };
    input.oncancel = () => reject(new PhotoCaptureCancelledError());
    input.click();
  });
}

function resizeImageWeb(file: File, maxDim: number = 1280): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(resizedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.8
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

