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
  // Request permission and register for push notifications
  PushNotifications.requestPermissions().then((result) => {
    if (result.receive === 'granted') {
      PushNotifications.register();
    } else {
      console.warn("Push notification permission not granted");
    }
  });

  const addRegListener = PushNotifications.addListener('registration', (token) => {
    console.log('Push registration success, token:', token.value);
    updateFcmToken(token.value)
      .then(() => {
        console.log('FCM token registered to backend:', token.value);
      })
      .catch((err) => {
        console.error('Failed to register FCM token to backend:', err);
      });
  });

  const addErrListener = PushNotifications.addListener('registrationError', (error) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  const addNotificationListener = PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (notification) => {
      console.log('Push action performed:', notification);
      const reportId = extractReportId(notification.notification.data);
      if (reportId) {
        onOpenReport(reportId);
      }
    }
  );

  return () => {
    addRegListener.remove();
    addErrListener.remove();
    addNotificationListener.remove();
  };
}
