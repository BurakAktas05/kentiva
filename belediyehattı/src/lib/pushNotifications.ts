import { PushNotifications } from '@capacitor/push-notifications';
import { updateFcmToken } from '../api';

export type PushNavigationHandler = (reportId: string) => void;

function extractReportId(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const raw = data.reportId ?? data.report_id;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim();
  }
  return null;
}

/** Giriş yapmış vatandaş için FCM kaydı ve bildirime tıklama yönlendirmesi. */
export function setupCitizenPush(onOpenReport: PushNavigationHandler): () => void {
  // TODO: PushNotification Capacitor plugin'i Firebase google-services.json 
  // dosyası olmadan çağrılırsa Android'de FATAL EXCEPTION verip uygulamayı çöktürür.
  // Bu yüzden şimdilik devre dışı bırakıldı. Firebase yapılandırılınca açılabilir.
  
  console.warn("Push Notifications devre dışı bırakıldı (Firebase konfigürasyonu eksik)");
  return () => {};
}
