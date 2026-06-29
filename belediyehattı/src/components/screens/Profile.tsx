import { useState, useEffect } from 'react';
import { Award, Star, Settings as SettingsIcon, ChevronRight, LogOut, Loader2, Gift } from 'lucide-react';
import {
  getMyProfile,
  getMyReports,
  getSavedUser,
  ApiUserProfile,
  ApiReportList,
  logout as apiLogout,
  type PublicTenant,
} from '../../api';
import { Lang, t } from '../../i18n';
import MunicipalityCard from '../MunicipalityCard';

interface ProfileProps {
  onLogout: () => void;
  onSettings: () => void;
  onRewards: () => void;
  onChangeMunicipality?: () => void;
  municipality?: PublicTenant | null;
  lang: Lang;
  isDark: boolean;
}

export default function Profile({
  onLogout,
  onSettings,
  onRewards,
  onChangeMunicipality,
  municipality,
  lang,
  isDark,
}: ProfileProps) {
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [reports, setReports] = useState<ApiReportList[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');



  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoadError('');
    const [profileResult, reportsResult] = await Promise.allSettled([
      getMyProfile(),
      getMyReports(0, 100),
    ]);

    if (profileResult.status === 'fulfilled') {
      setProfile(profileResult.value);
    } else {
      console.error('Profil yüklenemedi', profileResult.reason);
      const saved = getSavedUser();
      if (saved) {
        const parts = (saved.fullName || '').trim().split(/\s+/);
        const firstName = parts[0] || saved.email.split('@')[0] || '?';
        const lastName = parts.slice(1).join(' ') || '';
        setProfile({
          id: saved.userId,
          email: saved.email,
          firstName,
          lastName,
          phoneNumber: null,
          roles: saved.roles || [],
          reputationScore: 100,
          reputationLevel: lang === 'tr' ? 'Yeni Üye' : 'New member',
        });
      } else {
        setLoadError(lang === 'tr' ? 'Profil yüklenemedi.' : 'Could not load profile.');
      }
    }

    if (reportsResult.status === 'fulfilled') {
      setReports(reportsResult.value.content || []);
    } else {
      console.warn('İhbar listesi yüklenemedi', reportsResult.reason);
      setReports([]);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await apiLogout();
    onLogout();
  };




  const points = profile?.reputationScore ?? 100;
  const level = profile?.reputationLevel ?? (lang === 'tr' ? 'Yeni Üye' : 'New member');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError && !profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setLoadError('');
            void loadProfile();
          }}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="rounded-b-3xl bg-gradient-to-br from-primary via-primary to-primary-dark px-6 pb-16 pt-8 text-white shadow-lg shadow-primary/20">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-2xl font-extrabold shadow-inner backdrop-blur-sm">
            <span>{profile ? profile.firstName.charAt(0) : '?'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-extrabold tracking-tight">
              {profile ? `${profile.firstName} ${profile.lastName}` : '—'}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-white/85">
              <Award className="h-4 w-4 shrink-0" /> {level}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 -mt-8 px-5">
        <div
          className={`relative z-10 flex items-center justify-between rounded-2xl border p-5 shadow-lg ${
            isDark ? 'border-slate-700 bg-slate-800 shadow-none' : 'border-slate-200/90 bg-white shadow-slate-200/40'
          }`}
        >
          <div className={`flex-1 border-r text-center ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('profile.points', lang)}
            </p>
            <p className="flex items-center justify-center gap-1 text-2xl font-extrabold text-primary dark:text-sky-300">
              {points} <Star className="h-5 w-5 fill-primary/25 text-primary dark:fill-sky-400/20 dark:text-sky-300" />
            </p>
          </div>
          <div className={`flex-1 border-r text-center ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('profile.reports', lang)}
            </p>
            <p className={`text-2xl font-extrabold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {reports.length}
            </p>
          </div>
          <div className="flex-1 text-center">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('profile.resolved', lang)}
            </p>
            <p className="text-2xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
              {reports.filter((r) => r.status === 'RESOLVED').length}
            </p>
          </div>
        </div>
      </div>

      {(() => {
        let levelTitle = '';
        let levelMoreText = '';
        if (points < 100) {
          const needed = 100 - points;
          levelTitle = lang === 'tr' ? 'Güvenilir Üye Olmaya Az Kaldı!' : 'Almost a Trusted Member!';
          levelMoreText = lang === 'tr' ? `${needed} puan daha topla, rozeti kap.` : `Earn ${needed} more points to unlock the badge.`;
        } else if (points < 250) {
          const needed = 250 - points;
          levelTitle = lang === 'tr' ? 'Aktif Vatandaş Olmaya Az Kaldı!' : 'Almost an Active Citizen!';
          levelMoreText = lang === 'tr' ? `${needed} puan daha topla, rozeti kap.` : `Earn ${needed} more points to unlock the badge.`;
        } else if (points < 500) {
          const needed = 500 - points;
          levelTitle = lang === 'tr' ? 'Gönüllü Üye Olmaya Az Kaldı!' : 'Almost a Volunteer!';
          levelMoreText = lang === 'tr' ? `${needed} puan daha topla, rozeti kap.` : `Earn ${needed} more points to unlock the badge.`;
        } else if (points < 800) {
          const needed = 800 - points;
          levelTitle = lang === 'tr' ? 'Şehrin Kahramanı Olmaya Az Kaldı!' : 'Almost a City Hero!';
          levelMoreText = lang === 'tr' ? `${needed} puan daha topla, rozeti kap.` : `Earn ${needed} more points to unlock the badge.`;
        } else {
          levelTitle = lang === 'tr' ? 'Harika Bir Vatandaşsın! 🏆' : 'You are an Amazing Citizen! 🏆';
          levelMoreText = lang === 'tr' ? 'En yüksek seviyeye ulaştın!' : 'You reached the highest level!';
        }

        return (
          <div className="mt-6 px-5">
            <div
              className={`flex items-center justify-between rounded-2xl border p-4 ${
                isDark ? 'border-primary/25 bg-primary/10' : 'border-primary/15 bg-primary/5'
              }`}
            >
              <div>
                <h4 className={`text-sm font-bold ${isDark ? 'text-sky-200' : 'text-primary'}`}>
                  {levelTitle}
                </h4>
                <p className={`mt-1 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {levelMoreText}
                </p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDark ? 'bg-primary/25' : 'bg-primary/15'}`}>
                <Award className={`h-6 w-6 ${isDark ? 'text-sky-200' : 'text-primary'}`} />
              </div>
            </div>
          </div>
        );
      })()}

      <div className="mt-6 px-5">
        <MunicipalityCard
          tenant={municipality}
          lang={lang}
          isDark={isDark}
          onChange={onChangeMunicipality}
          compact
        />
      </div>



      <div className="mt-8 space-y-3 px-5">
        <h3 className={`mb-2 px-1 font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {t('profile.account', lang)}
        </h3>

        <button
          type="button"
          onClick={onRewards}
          className={`flex w-full items-center justify-between rounded-2xl border p-4 shadow-sm transition-all active:scale-95 ${
            isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2 ${isDark ? 'bg-primary/20 text-sky-400' : 'bg-primary/10 text-primary'}`}>
              <Award className="h-5 w-5" />
            </div>
            <div className="text-left">
              <span className={`block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {lang === 'tr' ? 'Rütbe & Ödüller' : 'Ranks & Rewards'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">
                {lang === 'tr' ? 'Puan durumunu gör ve hediyeleri al' : 'View status and claim rewards'}
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={onSettings}
          className={`flex w-full items-center justify-between rounded-2xl border p-4 shadow-sm transition-all active:scale-95 ${
            isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2 ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
              <SettingsIcon className="h-5 w-5" />
            </div>
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {t('profile.settings', lang)}
            </span>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className={`flex w-full items-center justify-between rounded-2xl border p-4 transition-all active:scale-95 ${
            isDark ? 'border-red-900/30 bg-red-900/10 text-red-400' : 'border-red-200 bg-red-50 text-red-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2 ${isDark ? 'bg-red-900/30' : 'bg-red-100'}`}>
              <LogOut className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold">{t('profile.logout', lang)}</span>
          </div>
        </button>

      </div>
    </div>
  );
}
