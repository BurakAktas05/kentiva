import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { uploadMedia } from '../api';
import { captureReportPhotoFile, PhotoCaptureCancelledError } from '../lib/captureReportPhoto';
import { Lang } from '../i18n';

interface UseReportPhotosProps {
  lang: Lang;
  maxPhotos?: number;
}

interface ReportPhoto {
  mediaUrl: string;
  previewUrl: string;
}

const MEDIA_CACHE_PREFIX = 'media_cache_';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

function revokePreview(previewUrl: string) {
  if (previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl);
  }
}

function removeMediaCache(mediaUrl: string) {
  try {
    localStorage.removeItem(MEDIA_CACHE_PREFIX + mediaUrl);
  } catch {
    // Storage may be unavailable in private mode or native webviews.
  }
}

function cleanupPhotos(photos: ReportPhoto[], retainedPhotos: ReportPhoto[] = []) {
  const retainedMediaUrls = new Set(retainedPhotos.map((photo) => photo.mediaUrl));
  const retainedPreviews = new Set(retainedPhotos.map((photo) => photo.previewUrl));
  const cleanedMediaUrls = new Set<string>();
  const revokedPreviews = new Set<string>();

  photos.forEach((photo) => {
    if (!retainedMediaUrls.has(photo.mediaUrl) && !cleanedMediaUrls.has(photo.mediaUrl)) {
      removeMediaCache(photo.mediaUrl);
      cleanedMediaUrls.add(photo.mediaUrl);
    }

    if (!retainedPreviews.has(photo.previewUrl) && !revokedPreviews.has(photo.previewUrl)) {
      revokePreview(photo.previewUrl);
      revokedPreviews.add(photo.previewUrl);
    }
  });
}

export function useReportPhotos({ lang, maxPhotos = 3 }: UseReportPhotosProps) {
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const photosRef = useRef<ReportPhoto[]>([]);
  const mountedRef = useRef(true);
  const uploadingRef = useRef(false);
  const operationSequenceRef = useRef(0);
  const activeOperationRef = useRef(0);

  const commitPhotos = useCallback((nextPhotos: ReportPhoto[]) => {
    photosRef.current = nextPhotos;
    if (mountedRef.current) {
      setPhotos(nextPhotos);
    }
  }, []);

  const isOperationActive = (operationId: number) =>
    mountedRef.current && activeOperationRef.current === operationId;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      activeOperationRef.current = 0;
      operationSequenceRef.current += 1;
      uploadingRef.current = false;
      cleanupPhotos(photosRef.current);
      photosRef.current = [];
    };
  }, []);

  const mediaUrls = photos.map((photo) => photo.mediaUrl);
  const localPhotoPreviews = photos.map((photo) => photo.previewUrl);

  // These setters remain part of the hook contract. Internally both public arrays
  // are derived from the same records so their indexes can never drift apart.
  const setMediaUrls: Dispatch<SetStateAction<string[]>> = useCallback(
    (action) => {
      const currentPhotos = photosRef.current;
      const currentUrls = currentPhotos.map((photo) => photo.mediaUrl);
      const nextUrls = typeof action === 'function' ? action(currentUrls) : action;
      const availablePhotos = [...currentPhotos];
      const nextPhotos = nextUrls.map((mediaUrl) => {
        const existingIndex = availablePhotos.findIndex((photo) => photo.mediaUrl === mediaUrl);
        if (existingIndex >= 0) {
          return availablePhotos.splice(existingIndex, 1)[0];
        }
        return { mediaUrl, previewUrl: mediaUrl };
      });

      cleanupPhotos(availablePhotos, nextPhotos);
      commitPhotos(nextPhotos);
    },
    [commitPhotos],
  );

  const setLocalPhotoPreviews: Dispatch<SetStateAction<string[]>> = useCallback(
    (action) => {
      const currentPhotos = photosRef.current;
      const currentPreviews = currentPhotos.map((photo) => photo.previewUrl);
      const requestedPreviews = typeof action === 'function' ? action(currentPreviews) : action;
      const nextPhotos = currentPhotos.map((photo, index) => ({
        ...photo,
        previewUrl: requestedPreviews[index] ?? photo.mediaUrl,
      }));
      const retainedPreviews = new Set(nextPhotos.map((photo) => photo.previewUrl));

      currentPhotos.forEach((photo) => {
        if (!retainedPreviews.has(photo.previewUrl)) {
          revokePreview(photo.previewUrl);
        }
      });
      commitPhotos(nextPhotos);
    },
    [commitPhotos],
  );

  const handleCapturePhoto = async () => {
    if (uploadingRef.current || photosRef.current.length >= maxPhotos) return;

    const operationId = ++operationSequenceRef.current;
    activeOperationRef.current = operationId;
    uploadingRef.current = true;
    setIsUploading(true);
    setError('');
    let capturedPreviewUrl = '';

    try {
      const { file, previewUrl } = await captureReportPhotoFile();
      capturedPreviewUrl = previewUrl;

      if (!isOperationActive(operationId)) {
        revokePreview(previewUrl);
        return;
      }

      const urls = await uploadMedia(file);
      const mediaUrl = urls.find((url) => url.trim().length > 0)?.trim();

      if (!isOperationActive(operationId)) {
        revokePreview(previewUrl);
        return;
      }

      if (!mediaUrl) {
        throw new Error(lang === 'tr' ? 'Fotoğraf yüklenemedi.' : 'Upload failed.');
      }

      let cacheValue = previewUrl;
      try {
        cacheValue = await fileToBase64(file);
      } catch {
        // Keep the session preview when conversion is unsupported.
      }

      if (!isOperationActive(operationId)) {
        revokePreview(previewUrl);
        return;
      }

      try {
        localStorage.setItem(MEDIA_CACHE_PREFIX + mediaUrl, cacheValue);
      } catch {
        // A cache failure must not invalidate a successful server upload.
      }

      const currentPhotos = photosRef.current;
      if (currentPhotos.length >= maxPhotos) {
        removeMediaCache(mediaUrl);
        revokePreview(previewUrl);
        return;
      }

      commitPhotos([...currentPhotos, { mediaUrl, previewUrl }]);
      capturedPreviewUrl = '';
    } catch (err: unknown) {
      if (capturedPreviewUrl) {
        revokePreview(capturedPreviewUrl);
      }
      if (err instanceof PhotoCaptureCancelledError || !isOperationActive(operationId)) return;
      setError(err instanceof Error ? err.message : lang === 'tr' ? 'Fotoğraf yüklenemedi.' : 'Upload failed.');
    } finally {
      if (activeOperationRef.current === operationId) {
        activeOperationRef.current = 0;
        uploadingRef.current = false;
        if (mountedRef.current) {
          setIsUploading(false);
        }
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    const currentPhotos = photosRef.current;
    if (index < 0 || index >= currentPhotos.length) return;

    const removedPhoto = currentPhotos[index];
    const nextPhotos = currentPhotos.filter((_, photoIndex) => photoIndex !== index);
    cleanupPhotos([removedPhoto], nextPhotos);
    commitPhotos(nextPhotos);
  };

  const clearPhotos = () => {
    activeOperationRef.current = 0;
    operationSequenceRef.current += 1;
    uploadingRef.current = false;
    cleanupPhotos(photosRef.current);
    commitPhotos([]);
    setIsUploading(false);
    setError('');
  };

  return {
    mediaUrls,
    setMediaUrls,
    localPhotoPreviews,
    setLocalPhotoPreviews,
    isUploading,
    error,
    setError,
    handleCapturePhoto,
    handleRemovePhoto,
    clearPhotos,
    maxPhotos,
  };
}
