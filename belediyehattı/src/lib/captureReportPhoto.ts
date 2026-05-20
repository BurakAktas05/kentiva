import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export class PhotoCaptureCancelledError extends Error {
  constructor() {
    super('PHOTO_CAPTURE_CANCELLED');
    this.name = 'PhotoCaptureCancelledError';
  }
}

/** Rapor fotoğrafı yalnızca kameradan — galeri yok. */
export async function captureReportPhotoFile(): Promise<File> {
  if (Capacitor.isNativePlatform()) {
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
      });
      if (!photo.webPath) {
        throw new PhotoCaptureCancelledError();
      }
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
      return new File([blob], `report-${Date.now()}.jpg`, { type });
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

function pickFromCameraInputOnly(): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) resolve(file);
      else reject(new PhotoCaptureCancelledError());
    };
    input.oncancel = () => reject(new PhotoCaptureCancelledError());
    input.click();
  });
}
