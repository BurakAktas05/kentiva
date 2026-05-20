import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Globe, Moon, Sun, Monitor, Info, Check, Bell, Loader2 } from 'lucide-react';
import { Lang, LANGUAGES, t } from '../../i18n';
import { getNotificationPreferences, updateNotificationPreferences, type PublicTenant } from '../../api';
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
  const [savingId, setSavingId] = useState<string | null>(null);

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
    } catch (err: any) {
      alert(err.message || 'Hata olustu');
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
            <Info className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('settings.about', lang)}</h3>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-800">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.version', lang)}</span>
            <span className="text-sm text-slate-400">3.0.0</span>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
