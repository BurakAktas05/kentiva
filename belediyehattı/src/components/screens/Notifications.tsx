import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BellOff, CheckCheck, FileText, UserCheck, Info, Droplets, Zap, ChevronRight } from 'lucide-react';
import { getNotifications, markAllNotificationsRead, ApiNotification } from '../../api';
import { Lang, t } from '../../i18n';
import { kentivaCard, screenHeadingClass } from '../../lib/ui';

interface NotificationsProps {
  onBadgeUpdate: (count: number) => void;
  onOpenReport?: (reportId: string) => void;
  lang: Lang;
  isDark: boolean;
}

const getNotifIcon = (type: string) => {
  switch (type) {
    case 'REPORT_STATUS':
    case 'REPORT_STATUS_CHANGED':
      return <FileText className="w-5 h-5" />;
    case 'REPORT_ASSIGNED':
      return <UserCheck className="w-5 h-5" />;
    case 'OUTAGE_WATER':
      return <Droplets className="w-5 h-5" />;
    case 'OUTAGE_ELECTRIC':
      return <Zap className="w-5 h-5" />;
    default:
      return <Info className="w-5 h-5" />;
  }
};

const getNotifColor = (type: string, isDark: boolean) => {
  switch (type) {
    case 'REPORT_STATUS':
    case 'REPORT_STATUS_CHANGED':
      return isDark
        ? 'border-primary/40 bg-primary/20 text-secondary'
        : 'border-primary/20 bg-primary/10 text-primary';
    case 'REPORT_ASSIGNED':
      return isDark
        ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50'
        : 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'OUTAGE_WATER':
    case 'OUTAGE_ELECTRIC':
      return isDark
        ? 'bg-amber-900/30 text-amber-300 border-amber-900/50'
        : 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return isDark
        ? 'bg-slate-800 text-slate-400 border-slate-700'
        : 'bg-slate-50 text-slate-600 border-slate-100';
  }
};

function isReportNotification(notif: ApiNotification): boolean {
  return Boolean(notif.reportId);
}

export default function Notifications({ onBadgeUpdate, onOpenReport, lang, isDark }: NotificationsProps) {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications(0, 50);
      setNotifications(data.content || []);
      const unread = (data.content || []).filter((n) => !n.read).length;
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
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onBadgeUpdate(0);
    } catch (e) {
      console.error('İşaretleme hatası', e);
    }
  };

  const handleNotifClick = (notif: ApiNotification) => {
    if (notif.reportId && onOpenReport) {
      onOpenReport(notif.reportId);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pb-6 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h3 className={screenHeadingClass(isDark)}>{t('notif.title', lang)}</h3>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary"
          >
            <CheckCheck className="w-4 h-4" />
            {t('notif.mark.all', lang)}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-24 animate-pulse rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <BellOff className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">{t('notif.empty', lang)}</p>
          <p className="text-xs text-slate-400 mt-1">{t('notif.empty.desc', lang)}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, idx) => {
            const clickable = isReportNotification(notif) && Boolean(onOpenReport);
            const Wrapper = clickable ? 'button' : 'div';
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Wrapper
                  type={clickable ? 'button' : undefined}
                  onClick={clickable ? () => handleNotifClick(notif) : undefined}
                  className={`w-full text-left transition active:scale-[0.99] ${kentivaCard(
                    isDark,
                    `${!notif.read ? (isDark ? 'ring-1 ring-primary/30' : 'ring-1 ring-primary/20') : ''} ${
                      clickable ? 'cursor-pointer hover:border-primary/30' : ''
                    }`,
                  )}`}
                >
                  <div className="flex gap-3">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${getNotifColor(notif.type, isDark)}`}>
                      {getNotifIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className={`text-sm leading-snug ${
                            notif.read
                              ? 'font-medium text-slate-500 dark:text-slate-400'
                              : 'font-semibold text-slate-900 dark:text-white'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        <div className="flex shrink-0 items-center gap-1">
                          {!notif.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                          {clickable && <ChevronRight className="h-4 w-4 text-primary" />}
                        </div>
                      </div>
                      <p
                        className={`text-xs mt-1 leading-relaxed ${
                          notif.read ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {notif.body}
                      </p>
                      {clickable && (
                        <p className="mt-2 text-[10px] font-semibold text-primary">
                          {t('notif.openReport', lang)}
                        </p>
                      )}
                      <span className="text-[10px] text-slate-400 mt-2 block">
                        {new Date(notif.createdAt).toLocaleDateString(
                          lang === 'tr' ? 'tr-TR' : lang === 'ar' ? 'ar' : 'en-US',
                          { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
                        )}
                      </span>
                    </div>
                  </div>
                </Wrapper>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
