import { useEffect, useState } from 'react';
import { storageService } from '../../lib/storageService';
import { motion } from 'motion/react';
import { ChevronLeft, Globe, Moon, Sun, Monitor, Info, Check, Bell, Loader2, Star, MapPin } from 'lucide-react';
import { Lang, LANGUAGES, t } from '../../i18n';
import { getNotificationPreferences, updateNotificationPreferences, submitSystemFeedback, type PublicTenant } from '../../api';
import MunicipalityCard from '../MunicipalityCard';

interface SettingsProps {
  lang: Lang;
  isDark: boolean;
  theme: 'light' | 'dark' | 'system';
  municipality?: PublicTenant | null;
  onLangChange: (lang: Lang) => void;
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onBack: () => void;
  onChangeMunicipality?: () => void;
}

export default function Settings({
  lang,
  isDark,
  theme,
  municipality,
  onLangChange,
  onThemeChange,
  onBack,
  onChangeMunicipality,
}: SettingsProps) {
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState(true);
  const [outages, setOutages] = useState(true);
  const [bloodDonations, setBloodDonations] = useState(true);
  const [lostPets, setLostPets] = useState(true);
  const [surveys, setSurveys] = useState(true);
  const [locationPromptEnabled, setLocationPromptEnabled] = useState(() => {
    return storageService.getItem('belediye_location_auto_prompt') !== 'false';
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const closeFeedback = () => {
    setShowFeedbackModal(false);
    setFeedbackRating(5);
    setFeedbackContent('');
    setFeedbackError('');
  };

  const handleSendFeedback = async () => {
    if (!feedbackContent.trim()) {
      setFeedbackError('Lütfen bir geri bildirim metni yazın.');
      return;
    }
    setFeedbackSubmitting(true);
    setFeedbackError('');
    try {
      await submitSystemFeedback(feedbackRating, feedbackContent.trim());
      alert('Geri bildiriminiz için teşekkür ederiz!');
      closeFeedback();
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : 'Geri bildirim gönderilirken bir hata oluştu.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  useEffect(() => {
    getNotificationPreferences()
      .then((prefs) => {
        if (prefs) {
          setAnnouncements(prefs.announcementsEnabled);
          setOutages(prefs.outagesEnabled);
          setBloodDonations(prefs.bloodDonationsEnabled);
          setLostPets(prefs.lostPetsEnabled);
          setSurveys(prefs.surveysEnabled);
        }
      })
      .catch((err) => {
        console.warn('Ayarlarda bildirim tercihleri yuklenemedi:', err);
      })
      .finally(() => {
        setPrefsLoading(false);
      });
  }, []);

  const handleTogglePref = async (
    key: 'announcements' | 'outages' | 'blood' | 'lost' | 'surveys',
    currentVal: boolean
  ) => {
    setSavingId(key);
    const updatedPayload = {
      announcementsEnabled: key === 'announcements' ? !currentVal : announcements,
      outagesEnabled: key === 'outages' ? !currentVal : outages,
      bloodDonationsEnabled: key === 'blood' ? !currentVal : bloodDonations,
      lostPetsEnabled: key === 'lost' ? !currentVal : lostPets,
      surveysEnabled: key === 'surveys' ? !currentVal : surveys,
    };

    try {
      await updateNotificationPreferences(updatedPayload);
      if (key === 'announcements') setAnnouncements(!currentVal);
      if (key === 'outages') setOutages(!currentVal);
      if (key === 'blood') setBloodDonations(!currentVal);
      if (key === 'lost') setLostPets(!currentVal);
      if (key === 'surveys') setSurveys(!currentVal);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Hata olustu');
    } finally {
      setSavingId(null);
    }
  };

  const themeOptions = [
    { value: 'light' as const, icon: <Sun className="w-5 h-5" />, label: t('settings.theme.light', lang) },
    { value: 'dark' as const, icon: <Moon className="w-5 h-5" />, label: t('settings.theme.dark', lang) },
    { value: 'system' as const, icon: <Monitor className="w-5 h-5" />, label: t('settings.theme.system', lang) },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-6">
      <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
        <button type="button" onClick={onBack} className="-ml-2 p-2 text-slate-500 dark:text-slate-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t('settings.title', lang)}</h2>
      </div>

      <div className="space-y-6 p-5">
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
            {t('settings.municipality', lang)}
          </h3>
          <MunicipalityCard tenant={municipality} lang={lang} isDark={isDark} onChange={onChangeMunicipality} />
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('settings.language', lang)}</h3>
          </div>
          <div className="space-y-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => onLangChange(l.code)}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 transition-all ${
                  lang === l.code
                    ? 'border-primary bg-primary/10 dark:border-secondary dark:bg-primary/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{l.code === 'tr' ? '🇹🇷' : l.code === 'en' ? '🇬🇧' : '🇸🇦'}</span>
                  <div className="text-left">
                    <span
                      className={`text-sm font-semibold ${
                        lang === l.code ? 'text-primary dark:text-secondary' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {l.nativeName}
                    </span>
                    {l.code !== lang && <span className="block text-xs text-slate-400">{l.name}</span>}
                  </div>
                </div>
                {lang === l.code && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Moon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('settings.theme', lang)}</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onThemeChange(opt.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  theme === opt.value
                    ? 'border-primary bg-primary/10 dark:border-secondary dark:bg-primary/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                <span className={theme === opt.value ? 'text-primary dark:text-secondary' : 'text-slate-500 dark:text-slate-400'}>
                  {opt.icon}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    theme === opt.value ? 'text-primary dark:text-secondary' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('notification.prefs.title', lang)}</h3>
          </div>

          {prefsLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-slate-400 font-bold">{lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}</span>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
              {[
                { id: 'announcements', label: t('notification.prefs.announcements', lang), val: announcements },
                { id: 'outages', label: t('notification.prefs.outages', lang), val: outages },
                { id: 'blood', label: t('notification.prefs.blood', lang), val: bloodDonations },
                { id: 'lost', label: t('notification.prefs.lost', lang), val: lostPets },
                { id: 'surveys', label: t('notification.prefs.surveys', lang), val: surveys },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                  <button
                    type="button"
                    disabled={savingId !== null}
                    onClick={() => handleTogglePref(item.id as any, item.val)}
                    className={`relative h-6 w-11 flex-shrink-0 rounded-full p-0.5 transition-colors duration-205 focus:outline-none ${
                      item.val ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="h-5 w-5 rounded-full bg-white shadow"
                      animate={{ x: item.val ? 20 : 0 }}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('settings.location.title', lang)}</h3>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-between">
            <div className="flex flex-col pr-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t('settings.location.promptToggle', lang)}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{t('settings.location.promptDesc', lang)}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = !locationPromptEnabled;
                setLocationPromptEnabled(nextVal);
                storageService.setItem('belediye_location_auto_prompt', String(nextVal));
              }}
              className={`relative h-6 w-11 flex-shrink-0 rounded-full p-0.5 transition-colors duration-205 focus:outline-none ${
                locationPromptEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="h-5 w-5 rounded-full bg-white shadow"
                animate={{ x: locationPromptEnabled ? 20 : 0 }}
              />
            </button>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('settings.about', lang)}</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-800">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.version', lang)}</span>
              <span className="text-sm text-slate-400">3.0.0</span>
            </div>
            
            <button
              type="button"
              onClick={() => setShowFeedbackModal(true)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-slate-300 dark:hover:border-slate-600 dark:border-slate-700 dark:bg-slate-800"
            >
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Görüş & Öneri Paylaş</span>
              <span className="text-xs text-primary dark:text-secondary font-bold">Geri Bildirim</span>
            </button>
          </div>
        </section>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Uygulama Geri Bildirimi</h3>
            <p className="mt-1 text-xs text-slate-500">Görüş ve önerileriniz bizim için çok değerlidir.</p>

            {/* Star Rating Select */}
            <div className="mt-4 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFeedbackRating(s)}
                  className="p-1 transition-transform active:scale-95"
                >
                  <Star
                    className={`h-7 w-7 ${
                      s <= feedbackRating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300 dark:text-slate-750'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Comment Textarea */}
            <textarea
              className="mt-4 w-full h-24 rounded-xl border border-slate-200 bg-white p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white resize-none"
              placeholder="Fikirlerinizi veya sorunlarınızı buraya yazabilirsiniz..."
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
            />

            {/* Error message */}
            {feedbackError && (
              <p className="mt-2 text-xs font-semibold text-rose-600">{feedbackError}</p>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeFeedback}
                disabled={feedbackSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSendFeedback}
                disabled={feedbackSubmitting}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
              >
                {feedbackSubmitting ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
