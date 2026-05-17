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
  const cleanups: Array<() => void> = [];

  void PushNotifications.requestPermissions().then((result) => {
    if (result.receive === 'granted') {
      void PushNotifications.register();
    }
  });

  void PushNotifications.addListener('registration', (token) => {
    updateFcmToken(token.value).catch(console.error);
  }).then((h) => cleanups.push(() => h.remove()));

  void PushNotifications.addListener('registrationError', (err) => {
    console.warn('Push registration failed', err);
  }).then((h) => cleanups.push(() => h.remove()));

  const openFromPayload = (data: Record<string, unknown> | undefined) => {
    const reportId = extractReportId(data);
    if (reportId) {
      onOpenReport(reportId);
    }
  };

  void PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    openFromPayload(action.notification.data as Record<string, unknown> | undefined);
  }).then((h) => cleanups.push(() => h.remove()));

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
  };
}
