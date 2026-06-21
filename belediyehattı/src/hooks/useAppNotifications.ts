import { useState, useEffect } from 'react';
import { getUnreadCount } from '../api';
import { setupCitizenPush } from '../lib/pushNotifications';

interface UseAppNotificationsProps {
  user: any;
  onPushNotificationClick: (reportId: string) => void;
}

export function useAppNotifications({ user, onPushNotificationClick }: UseAppNotificationsProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);

      const teardownPush = setupCitizenPush((reportId) => {
        onPushNotificationClick(reportId);
      });

      return () => {
        clearInterval(interval);
        teardownPush();
      };
    }
  }, [user, onPushNotificationClick]);

  return {
    unreadCount,
    setUnreadCount,
    loadUnreadCount,
  };
}
