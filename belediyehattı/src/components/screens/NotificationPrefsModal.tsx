import { useEffect, useState } from 'react';
import { storageService } from '../../lib/storageService';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Loader2, X } from 'lucide-react';
import { getNotificationPreferences, updateNotificationPreferences } from '../../api';
import { Lang, t } from '../../i18n';

interface NotificationPrefsModalProps {
  lang: Lang;
  isDark: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPrefsModal({ lang, isDark, isOpen, onClose }: NotificationPrefsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [announcements, setAnnouncements] = useState(true);
  const [outages, setOutages] = useState(true);
  const [bloodDonations, setBloodDonations] = useState(true);
  const [lostPets, setLostPets] = useState(true);
  const [surveys, setSurveys] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setSaveError('');
    getNotificationPreferences()
      .then((prefs) => {
        if (!prefs) return;
        setAnnouncements(prefs.announcementsEnabled);
        setOutages(prefs.outagesEnabled);
        setBloodDonations(prefs.bloodDonationsEnabled);
        setLostPets(prefs.lostPetsEnabled);
        setSurveys(prefs.surveysEnabled);
      })
      .catch((err) => {
        console.warn('Bildirim tercihleri yuklenemedi, varsayilanlar kullaniliyor.', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await updateNotificationPreferences({
        announcementsEnabled: announcements,
        outagesEnabled: outages,
        bloodDonationsEnabled: bloodDonations,
        lostPetsEnabled: lostPets,
        surveysEnabled: surveys,
      });
      storageService.setItem('belediye_notification_prefs_onboarded', 'true');
      onClose();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error
          ? err.message
          : lang === 'tr'
            ? 'Tercihler kaydedilirken bir hata olustu.'
            : 'An error occurred while saving preferences.',
      );
    } finally {
      setSaving(false);
    }
  };

  const skipOnboarding = () => {
    storageService.setItem('belediye_notification_prefs_onboarded', 'true');
    onClose();
  };

  const prefItems = [
    {
      id: 'announcements',
      title: t('notification.prefs.announcements', lang),
      desc: lang === 'tr' ? 'Belediyeden onemli haberler ve duyurular' : 'Important news and announcements from municipality',
      state: announcements,
      setter: setAnnouncements,
    },
    {
      id: 'outages',
      title: t('notification.prefs.outages', lang),
      desc: lang === 'tr' ? 'Bolgenizdeki planli su ve elektrik kesintileri' : 'Planned water and electricity outages in your area',
      state: outages,
      setter: setOutages,
    },
    {
      id: 'blood',
      title: t('notification.prefs.blood', lang),
      desc: lang === 'tr' ? 'Ilcenizdeki acil kan bagisi cagrilari' : 'Urgent blood donation requests in your district',
      state: bloodDonations,
      setter: setBloodDonations,
    },
    {
      id: 'lost',
      title: t('notification.prefs.lost', lang),
      desc: lang === 'tr' ? 'Yakinlarinizda yayinlanan kayip hayvan ilanlari' : 'Lost pet listings published near you',
      state: lostPets,
      setter: setLostPets,
    },
    {
      id: 'surveys',
      title: t('notification.prefs.surveys', lang),
      desc: lang === 'tr' ? 'Sehir kararlarina katilmaniz icin yeni anketler' : 'New municipal polls to participate in city decisions',
      state: surveys,
      setter: setSurveys,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="absolute inset-0 -z-10" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className={`w-full max-w-lg overflow-hidden rounded-t-3xl border p-6 shadow-2xl sm:rounded-3xl ${
              isDark ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Bell className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">{t('notification.prefs.title', lang)}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('notification.prefs.subtitle', lang)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                <span className="text-xs font-bold text-slate-400">
                  {lang === 'tr' ? 'Tercihler yukleniyor...' : 'Loading preferences...'}
                </span>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="max-h-[45vh] space-y-2.5 overflow-y-auto pr-1">
                  {prefItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => item.setter(!item.state)}
                      className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition-all duration-200 ${
                        item.state
                          ? 'border-primary/20 bg-primary/5 dark:border-secondary/20 dark:bg-primary/10'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/20'
                      }`}
                    >
                      <div className="flex-1">
                        <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">{item.title}</h4>
                        <p className="mt-0.5 text-[10px] leading-snug text-slate-400 dark:text-slate-400">{item.desc}</p>
                      </div>

                      <div
                        className={`relative h-6 w-11 flex-shrink-0 rounded-full p-0.5 transition-colors duration-200 ${
                          item.state ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-800'
                        }`}
                      >
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="h-5 w-5 rounded-full bg-white shadow"
                          animate={{ x: item.state ? 20 : 0 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {saveError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
                    {saveError}
                  </div>
                )}

                <div className="mt-2 flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={skipOnboarding}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-xs font-extrabold text-slate-500 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                  >
                    {lang === 'tr' ? 'Daha Sonra' : 'Later'}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-xs font-extrabold text-white shadow-lg shadow-primary/20 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>{t('notification.prefs.save', lang)}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
