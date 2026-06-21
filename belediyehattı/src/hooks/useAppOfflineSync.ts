import { useEffect } from 'react';
import { createReport } from '../api';
import { storageService } from '../lib/storageService';

export function useAppOfflineSync() {
  useEffect(() => {
    const syncOfflineReports = async () => {
      const raw = storageService.getItem('belediye_offline_reports');
      if (!raw) return;
      
      let queue: Array<{
        title: string; description: string; categoryId: string;
        latitude: number; longitude: number; district: string | null;
        mediaUrls: string[]; targetMunicipalityId: string | null;
        kvkkApproved: boolean; savedAt: string;
      }> = [];
      try {
        queue = JSON.parse(raw);
      } catch {
        return;
      }
      if (queue.length === 0) return;

      const remaining = [...queue];
      let synced = 0;
      for (const r of queue) {
        try {
          await createReport(
            r.title, r.description, r.categoryId,
            r.latitude, r.longitude, r.district ?? undefined,
            r.mediaUrls || [], r.targetMunicipalityId, r.kvkkApproved,
          );
          const idx = remaining.indexOf(r);
          if (idx > -1) remaining.splice(idx, 1);
          synced++;
        } catch {
          // Keep in queue for next attempt
        }
      }
      storageService.setItem('belediye_offline_reports', JSON.stringify(remaining));
      if (synced > 0) {
        console.log(`[Kentiva] ${synced} offline rapor başarıyla gönderildi.`);
      }
    };

    const handler = () => { void syncOfflineReports(); };
    window.addEventListener('online', handler);
    // Try on mount as well if we are online
    if (navigator.onLine) handler();
    
    return () => window.removeEventListener('online', handler);
  }, []);
}
