import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BellOff, CheckCheck, FileText, UserCheck, Info, Loader2, Droplets, Zap } from 'lucide-react';
import { getNotifications, markAllNotificationsRead, ApiNotification } from '../../api';
import { Lang, t } from '../../i18n';

interface NotificationsProps {
  onBadgeUpdate: (count: number) => void;
  lang: Lang;
  isDark: boolean;
}

const getNotifIcon = (type: string) => {
  switch (type) {
    case 'REPORT_STATUS_CHANGED': return <FileText className="w-5 h-5" />;
    case 'REPORT_ASSIGNED': return <UserCheck className="w-5 h-5" />;
    case 'OUTAGE_WATER': return <Droplets className="w-5 h-5" />;
    case 'OUTAGE_ELECTRIC': return <Zap className="w-5 h-5" />;
    default: return <Info className="w-5 h-5" />;
  }
};

const getNotifColor = (type: string, isDark: boolean) => {
  switch (type) {
    case 'REPORT_STATUS_CHANGED': return isDark ? 'border-primary/40 bg-primary/20 text-secondary' : 'border-primary/20 bg-primary/10 text-primary';
    case 'REPORT_ASSIGNED': return isDark ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50' : 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'OUTAGE_WATER':
    case 'OUTAGE_ELECTRIC':
      return isDark ? 'bg-amber-900/30 text-amber-300 border-amber-900/50' : 'bg-amber-50 text-amber-700 border-amber-200';
    default: return isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-100';
  }
};

export default function Notifications({ onBadgeUpdate, lang, isDark }: NotificationsProps) {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications(0, 50);
      setNotifications(data.content || []);
      const unread = (data.content || []).filter(n => !n.read).length;
      onBadgeUpdate(unread);
    } catch (e) {
      console.error('Bildirimler yüklenemedi', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onBadgeUpdate(0);
    } catch (e) {
      console.error('İşaretleme hatası', e);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-4"
    >
      <div className="flex items-center justify-between px-1">
        <h3 className={`font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>{t('notif.title', lang)}</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary-hover dark:text-secondary"
          >
            <CheckCheck className="w-4 h-4" />
            {t('notif.mark.all', lang)}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`rounded-2xl p-4 border animate-pulse ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex gap-3">
                <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-3 rounded w-2/3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <div className={`h-3 rounded w-full ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <BellOff className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">{t('notif.empty', lang)}</p>
          <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">{t('notif.empty.desc', lang)}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, idx) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-2xl p-4 border transition-all ${
                isDark 
                  ? notif.read ? 'bg-slate-800/40 border-slate-800' : 'border-primary/30 bg-slate-800 shadow-lg shadow-primary/10'
                  : notif.read ? 'bg-white border-slate-200' : 'border-primary/25 bg-white shadow-sm shadow-primary/15'
              }`}
            >
              <div className="flex gap-3">
                <div className={`p-2.5 rounded-xl border flex-shrink-0 ${getNotifColor(notif.type, isDark)}`}>
                  {getNotifIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm ${notif.read ? 'font-medium text-slate-500 dark:text-slate-400' : 'font-bold text-slate-900 dark:text-white'}`}>
                      {notif.title}
                    </h4>
                    {!notif.read && (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${notif.read ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                    {notif.body}
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-600 mt-2 block">
                    {new Date(notif.createdAt).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
