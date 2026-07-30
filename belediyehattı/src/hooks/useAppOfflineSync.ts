import { useEffect, useRef } from 'react';
import { createReport } from '../api';
import { storageService } from '../lib/storageService';

export type OfflineSyncDetail = {
  remaining: number;
  synced: number;
};

export function useAppOfflineSync() {
  const retryTimeoutRef = useRef<number | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    const syncOfflineReports = async () => {
      if (syncingRef.current) return;
      const raw = storageService.getItem('belediye_offline_reports');
      if (!raw) return;

      let queue: Array<{
        title: string;
        description: string;
        categoryId: string;
        latitude: number;
        longitude: number;
        district: string | null;
        mediaUrls: string[];
        targetMunicipalityId: string | null;
        kvkkApproved: boolean;
        savedAt: string;
      }> = [];
      try {
        queue = JSON.parse(raw);
      } catch {
        return;
      }
      if (queue.length === 0) return;

      syncingRef.current = true;
      const initialCount = queue.length;
      const remaining = [...queue];
      for (const r of queue) {
        try {
          await createReport(
            r.title,
            r.description,
            r.categoryId,
            r.latitude,
            r.longitude,
            r.district ?? undefined,
            r.mediaUrls || [],
            r.targetMunicipalityId,
            r.kvkkApproved,
          );
          const idx = remaining.indexOf(r);
          if (idx > -1) remaining.splice(idx, 1);
        } catch {
          // Keep in queue for next attempt
        }
      }
      storageService.setItem('belediye_offline_reports', JSON.stringify(remaining));

      const detail: OfflineSyncDetail = {
        remaining: remaining.length,
        synced: initialCount - remaining.length,
      };
      window.dispatchEvent(new CustomEvent('kentiva:offline-sync', { detail }));

      syncingRef.current = false;
      if (remaining.length > 0 && navigator.onLine) {
        retryTimeoutRef.current = window.setTimeout(() => {
          void syncOfflineReports();
        }, 30_000);
      }
    };

    const handler = () => {
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      void syncOfflineReports();
    };
    window.addEventListener('online', handler);
    if (navigator.onLine) handler();

    return () => {
      window.removeEventListener('online', handler);
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);
}
