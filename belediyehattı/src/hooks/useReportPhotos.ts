import { useState, useEffect } from 'react';
import { uploadMedia } from '../api';
import { captureReportPhotoFile, PhotoCaptureCancelledError } from '../lib/captureReportPhoto';
import { Lang } from '../i18n';

interface UseReportPhotosProps {
  lang: Lang;
  maxPhotos?: number;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export function useReportPhotos({ lang, maxPhotos = 3 }: UseReportPhotosProps) {
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [localPhotoPreviews, setLocalPhotoPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      localPhotoPreviews.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [localPhotoPreviews]);

  const handleCapturePhoto = async () => {
    if (isUploading || mediaUrls.length >= maxPhotos) return;
    setError('');

    try {
      const { file, previewUrl } = await captureReportPhotoFile();
      setLocalPhotoPreviews((prev) => [...prev, previewUrl]);
      setIsUploading(true);

      const urls = await uploadMedia(file);
      if (urls.length === 0) {
        return;
      }
      setMediaUrls((prev) => [...prev, urls[0]]);

      try {
        const base64 = await fileToBase64(file);
        localStorage.setItem('media_cache_' + urls[0], base64);
      } catch {
        try {
          localStorage.setItem('media_cache_' + urls[0], previewUrl);
        } catch {
          // ignore cache errors (e.g. quota exceeded)
        }
      }
    } catch (err: unknown) {
      if (err instanceof PhotoCaptureCancelledError) return;
      setError(err instanceof Error ? err.message : lang === 'tr' ? 'Fotoğraf yüklenemedi.' : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
    setLocalPhotoPreviews((prev) => {
      const removed = prev[index];
      if (removed?.startsWith('blob:')) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearPhotos = () => {
    localPhotoPreviews.forEach((url) => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setMediaUrls([]);
    setLocalPhotoPreviews([]);
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
