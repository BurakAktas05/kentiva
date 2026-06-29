import { useEffect, useState } from 'react';
import { storageService } from '../../lib/storageService';
import { motion } from 'motion/react';
import {
  Bell,
  Check,
  ChevronLeft,
  ExternalLink,
  Globe,
  Info,
  Loader2,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Phone,
  ShieldAlert,
  Star,
  Sun,
  Trash2,
} from 'lucide-react';
import { deleteMyAccount, getNotificationPreferences, submitSystemFeedback, updateNotificationPreferences, type PublicTenant } from '../../api';
import { Lang, LANGUAGES, t } from '../../i18n';
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
  onNavigate: (tab: any) => void;
  onSessionEnded: () => void;
}

type NoticeState = {
  tone: 'success' | 'error' | 'info';
  message: string;
} | null;

function textByLang(lang: Lang, tr: string, en: string): string {
  return lang === 'tr' ? tr : en;
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
  onNavigate,
  onSessionEnded,
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
  const [notice, setNotice] = useState<NoticeState>(null);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const closeFeedback = () => {
    setShowFeedbackModal(false);
    setFeedbackRating(5);
    setFeedbackContent('');
    setFeedbackError('');
  };

  const clearLocalCitizenData = () => {
    storageService.removeItem('belediye_offline_reports');
    storageService.removeItem('belediye_offline_profile');
    storageService.removeItem('belediye_offline_tenant');
    storageService.removeItem('belediye_location_pending_tenant');
  };

  const handleSendFeedback = async () => {
    if (!feedbackContent.trim()) {
      setFeedbackError(textByLang(lang, 'Lutfen geri bildirim metni yazin.', 'Please write your feedback message.'));
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackError('');
    try {
      await submitSystemFeedback(feedbackRating, feedbackContent.trim());
      setNotice({
        tone: 'success',
        message: textByLang(lang, 'Geri bildiriminiz alindi. Tesekkur ederiz.', 'Your feedback has been received. Thank you.'),
      });
      closeFeedback();
    } catch (err: unknown) {
      setFeedbackError(
        err instanceof Error
          ? err.message
          : textByLang(lang, 'Geri bildirim gonderilirken bir hata olustu.', 'An error occurred while sending feedback.'),
      );
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  useEffect(() => {
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
        console.warn('Ayarlarda bildirim tercihleri yuklenemedi:', err);
      })
      .finally(() => {
        setPrefsLoading(false);
      });
  }, []);

  const handleTogglePref = async (
    key: 'announcements' | 'outages' | 'blood' | 'lost' | 'surveys',
    currentVal: boolean,
  ) => {
    setSavingId(key);
    setNotice(null);

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

      setNotice({
        tone: 'success',
        message: t('notification.prefs.success', lang),
      });
    } catch (err: unknown) {
      setNotice({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : textByLang(lang, 'Bildirim tercihi guncellenemedi.', 'Notification preference could not be updated.'),
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      await deleteMyAccount();
      clearLocalCitizenData();
      setShowDeleteConfirm(false);
      onSessionEnded();
      onNavigate('home');
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : textByLang(lang, 'Hesap silme islemi tamamlanamadi.', 'Account deletion could not be completed.'),
      );
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const themeOptions = [
    { value: 'light' as const, icon: <Sun className="h-5 w-5" />, label: t('settings.theme.light', lang) },
    { value: 'dark' as const, icon: <Moon className="h-5 w-5" />, label: t('settings.theme.dark', lang) },
    { value: 'system' as const, icon: <Monitor className="h-5 w-5" />, label: t('settings.theme.system', lang) },
  ];

  const noticeClasses =
    notice?.tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300'
      : notice?.tone === 'info'
        ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-6">
      <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
        <button type="button" onClick={onBack} className="-ml-2 p-2 text-slate-500 dark:text-slate-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t('settings.title', lang)}</h2>
      </div>

      <div className="space-y-6 p-5">
        {notice && (
          <div className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${noticeClasses}`}>
            {notice.message}
          </div>
        )}

        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
            {t('settings.municipality', lang)}
          </h3>
          <MunicipalityCard tenant={municipality} lang={lang} isDark={isDark} onChange={onChangeMunicipality} />
        </section>

        {municipality && (municipality.contactPhone || municipality.contactEmail || municipality.websiteUrl) ? (
          <section className="rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary dark:text-sky-300">
              {t('settings.contact.title', lang)}
            </h3>
            <p className="mb-3 text-[10px] text-slate-500 dark:text-slate-400">{t('settings.contact.desc', lang)}</p>
            <div className="space-y-2">
              {municipality.contactPhone && (
                <a
                  href={`tel:${municipality.contactPhone}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/30"
                >
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-emerald-500" />
                    <div>
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                        {t('settings.contact.phone', lang)}
                      </span>
                      <span className="block text-[10px] font-medium text-slate-400">{municipality.contactPhone}</span>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                </a>
              )}
              {municipality.contactEmail && (
                <a
                  href={`mailto:${municipality.contactEmail}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/30"
                >
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-primary" />
                    <div>
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                        {t('settings.contact.email', lang)}
                      </span>
                      <span className="block max-w-[200px] truncate text-[10px] font-medium text-slate-400">
                        {municipality.contactEmail}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                </a>
              )}
              {municipality.websiteUrl && (
                <a
                  href={municipality.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/30"
                >
                  <div className="flex items-center gap-2.5">
                    <Globe className="h-4 w-4 text-sky-500" />
                    <div>
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                        {t('settings.contact.website', lang)}
                      </span>
                      <span className="block max-w-[200px] truncate text-[10px] font-medium text-slate-400">
                        {municipality.websiteUrl}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                </a>
              )}
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('settings.language', lang)}</h3>
          </div>
          <div className="space-y-2">
            {LANGUAGES.map((language) => (
              <button
                key={language.code}
                type="button"
                onClick={() => onLangChange(language.code)}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 transition-all ${
                  lang === language.code
                    ? 'border-primary bg-primary/10 dark:border-secondary dark:bg-primary/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <span
                      className={`text-sm font-semibold ${
                        lang === language.code ? 'text-primary dark:text-secondary' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {language.nativeName}
                    </span>
                    {language.code !== lang && <span className="block text-xs text-slate-400">{language.name}</span>}
                  </div>
                </div>
                {lang === language.code && (
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
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onThemeChange(option.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  theme === option.value
                    ? 'border-primary bg-primary/10 dark:border-secondary dark:bg-primary/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                <span className={theme === option.value ? 'text-primary dark:text-secondary' : 'text-slate-500 dark:text-slate-400'}>
                  {option.icon}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    theme === option.value ? 'text-primary dark:text-secondary' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {option.label}
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
              <span className="text-xs font-bold text-slate-400">{textByLang(lang, 'Yukleniyor...', 'Loading...')}</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
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
                    className={`relative h-6 w-11 flex-shrink-0 rounded-full p-0.5 transition-colors duration-200 ${
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
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-col pr-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t('settings.location.promptToggle', lang)}</span>
              <span className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{t('settings.location.promptDesc', lang)}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextValue = !locationPromptEnabled;
                setLocationPromptEnabled(nextValue);
                storageService.setItem('belediye_location_auto_prompt', String(nextValue));
              }}
              className={`relative h-6 w-11 flex-shrink-0 rounded-full p-0.5 transition-colors duration-200 ${
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

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {textByLang(lang, 'Gizlilik ve veri talepleri', 'Privacy and data requests')}
            </h3>
          </div>
          <div className="space-y-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <p>
              {textByLang(
                lang,
                'KVKK kapsamindaki basvurulariniz, veri duzeltme veya hesap kapatma talepleriniz icin uygulama ici yonetim ve resmi iletisim kanallari kullanilabilir.',
                'You can use the in-app controls and official contact channels for privacy requests, data corrections, or account closure.',
              )}
            </p>
            <p>
              {textByLang(
                lang,
                'Hesabinizi kapattiginizda aktif oturumlariniz sonlandirilir, sosyal ilanlariniz kaldirilir ve profil bilgileriniz anonimlestirilir. Belediye ihbar kayitlari mevzuat geregi anonimlestirilmis halde saklanabilir.',
                'When you close your account, active sessions are revoked, your social listings are removed, and your profile data is anonymized. Core municipal report records may remain in anonymized form for legal retention.',
              )}
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <a
              href="mailto:kvkk@kentiva.app?subject=KVKK%20Basvurusu"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Mail className="h-4 w-4" />
              {textByLang(lang, 'KVKK iletisimi', 'Privacy contact')}
            </a>
            <button
              type="button"
              onClick={() => {
                setDeleteError('');
                setShowDeleteConfirm(true);
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-rose-500"
            >
              <Trash2 className="h-4 w-4" />
              {textByLang(lang, 'Hesabımı Sil', 'Delete Account')}
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

            <a
              href="https://kentiva.app/gizlilik-politikasi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
            >
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {lang === 'tr' ? 'Gizlilik Politikası' : lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
              </span>
              <ExternalLink className="h-4 w-4 text-slate-400" />
            </a>

            <a
              href="https://kentiva.app/kullanim-kosullari"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
            >
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {lang === 'tr' ? 'Kullanım Koşulları' : lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Service'}
              </span>
              <ExternalLink className="h-4 w-4 text-slate-400" />
            </a>

            <button
              type="button"
              onClick={() => setShowFeedbackModal(true)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
            >
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {textByLang(lang, 'Gorus ve onerilerinizi paylasin', 'Share feedback and suggestions')}
              </span>
              <span className="text-xs font-bold text-primary dark:text-secondary">
                {textByLang(lang, 'Geri bildirim', 'Feedback')}
              </span>
            </button>
          </div>
        </section>
      </div>

      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {textByLang(lang, 'Uygulama geri bildirimi', 'App feedback')}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {textByLang(lang, 'Deneyiminizi bizimle paylasin.', 'Share your experience with us.')}
            </p>

            <div className="mt-4 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  className="p-1 transition-transform active:scale-95"
                >
                  <Star
                    className={`h-7 w-7 ${
                      star <= feedbackRating ? 'fill-yellow-500 text-yellow-500' : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              className="mt-4 h-24 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder={textByLang(lang, 'Fikirlerinizi veya yasadiginiz sorunu yazin...', 'Write your feedback or issue...')}
              value={feedbackContent}
              onChange={(event) => setFeedbackContent(event.target.value)}
            />

            {feedbackError && <p className="mt-2 text-xs font-semibold text-rose-600">{feedbackError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeFeedback}
                disabled={feedbackSubmitting}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {textByLang(lang, 'Vazgec', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSendFeedback}
                disabled={feedbackSubmitting}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-primary/90"
              >
                {feedbackSubmitting ? textByLang(lang, 'Gonderiliyor...', 'Sending...') : textByLang(lang, 'Gonder', 'Send')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl border border-rose-200 bg-white p-5 shadow-xl dark:border-rose-900 dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {textByLang(lang, 'Hesabımı Sil', 'Delete Account')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {textByLang(
                    lang,
                    'Bu islem geri alinmaz. Profil bilgileriniz anonimlestirilir, sosyal ilanlariniz kaldirilir ve oturumunuz kapatilir.',
                    'This action cannot be undone. Your profile is anonymized, social listings are removed, and your current session is closed.',
                  )}
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteSubmitting}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {textByLang(lang, 'Vazgec', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-70"
              >
                {deleteSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleteSubmitting ? textByLang(lang, 'Isleniyor...', 'Processing...') : textByLang(lang, 'Hesabımı Sil', 'Delete Account')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
