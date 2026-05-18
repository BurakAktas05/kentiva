import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, Star, List, Settings as SettingsIcon, ChevronRight, LogOut, Shield, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { getMyProfile, getMyReports, ApiUserProfile, ApiReportList, logout as apiLogout } from '../../api';
import { Lang, t } from '../../i18n';

interface ProfileProps {
  onLogout: () => void;
  onSettings: () => void;
  onOpenReport?: (reportId: string) => void;
  lang: Lang;
  isDark: boolean;
}

const getStatusInfo = (status: string, lang: Lang) => {
  const label = t(`status.${status}`, lang);
  switch (status) {
    case 'RESOLVED': return { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600 dark:text-emerald-400', label };
    case 'PROCESSING': return { icon: <Loader2 className="w-4 h-4" />, color: 'text-primary dark:text-secondary', label };
    case 'REJECTED': return { icon: <XCircle className="w-4 h-4" />, color: 'text-red-600 dark:text-red-400', label };
    default: return { icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 dark:text-amber-400', label };
  }
};

export default function Profile({ onLogout, onSettings, onOpenReport, lang, isDark }: ProfileProps) {
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [reports, setReports] = useState<ApiReportList[]>([]);
  const [showReports, setShowReports] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [p, r] = await Promise.all([
        getMyProfile(),
        getMyReports(0, 100),
      ]);
      setProfile(p);
      setReports(r.content || []);
    } catch (e) {
      console.error('Profil yüklenemedi', e);
      setLoadError(lang === 'tr' ? 'Profil yüklenemedi.' : 'Could not load profile.');
    } finally {
      setLoading(false);
    }
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-6"
    >
      {/* Header */}
      <div className="rounded-b-3xl bg-gradient-to-br from-primary via-primary to-primary-dark px-6 pb-16 pt-8 text-white shadow-lg shadow-primary/20">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-2xl font-extrabold shadow-inner backdrop-blur-sm">
            <span>{profile ? profile.firstName.charAt(0) : '?'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-extrabold tracking-tight">{profile ? `${profile.firstName} ${profile.lastName}` : '—'}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-white/85">
              <Award className="h-4 w-4 shrink-0" /> {level}
            </p>
          </div>
          <button 
            onClick={onSettings}
            className="rounded-xl border border-white/20 bg-white/10 p-2.5 transition-colors hover:bg-white/20"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 -mt-8 relative z-10">
        <div
          className={`relative z-10 flex items-center justify-between rounded-2xl border p-5 shadow-lg ${
            isDark ? 'border-slate-700 bg-slate-800 shadow-none' : 'border-slate-200/90 bg-white shadow-slate-200/40'
          }`}
        >
          <div className={`flex-1 border-r text-center ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('profile.points', lang)}</p>
            <p className="flex items-center justify-center gap-1 text-2xl font-extrabold text-primary dark:text-sky-300">
              {points} <Star className="h-5 w-5 fill-primary/25 text-primary dark:fill-sky-400/20 dark:text-sky-300" />
            </p>
          </div>
          <div className={`flex-1 border-r text-center ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('profile.reports', lang)}</p>
            <p className={`text-2xl font-extrabold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>{reports.length}</p>
          </div>
          <div className="flex-1 text-center">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('profile.resolved', lang)}</p>
            <p className="text-2xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
              {reports.filter((r) => r.status === 'RESOLVED').length}
            </p>
          </div>
        </div>
      </div>

      {/* Level Callout */}
      <div className="px-5 mt-6">
        <div
          className={`flex items-center justify-between rounded-2xl border p-4 ${
            isDark ? 'border-primary/25 bg-primary/10' : 'border-primary/15 bg-primary/5'
          }`}
        >
          <div>
            <h4 className={`text-sm font-bold ${isDark ? 'text-sky-200' : 'text-primary'}`}>
              {points < 1000 ? t('profile.level.hero', lang) : t('profile.level.hero.done', lang)}
            </h4>
            <p className={`mt-1 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {points < 1000 ? t('profile.level.more', lang, { n: 1000 - points }) : t('profile.level.max', lang)}
            </p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDark ? 'bg-primary/25' : 'bg-primary/15'}`}>
            <Award className={`h-6 w-6 ${isDark ? 'text-sky-200' : 'text-primary'}`} />
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-5 mt-8 space-y-3">
        <h3 className={`font-bold tracking-tight mb-2 px-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{t('profile.account', lang)}</h3>
        
        <button 
          onClick={() => setShowReports(!showReports)}
          className={`w-full flex items-center justify-between p-4 rounded-2xl shadow-sm border transition-all active:scale-95 ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2 ${isDark ? 'bg-primary/25 text-secondary' : 'bg-primary/10 text-primary'}`}>
              <List className="w-5 h-5" />
            </div>
            <span className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('profile.history', lang)}</span>
          </div>
          <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${showReports ? 'rotate-90' : ''}`} />
        </button>

        {showReports && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2 pl-2"
          >
            {reports.length === 0 ? (
              <p className="text-sm text-slate-400 p-3">{t('home.reports.empty.title', lang)}</p>
            ) : (
              reports.map(r => {
                const status = getStatusInfo(r.status, lang);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onOpenReport?.(r.id)}
                    disabled={!onOpenReport}
                    className={`w-full rounded-xl p-3 border flex items-center justify-between text-left transition-colors ${
                      onOpenReport ? 'cursor-pointer hover:border-primary/30 active:scale-[0.99]' : ''
                    } ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{r.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{r.categoryName} • {new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] font-bold ${status.color} ml-2 flex-shrink-0`}>
                      {status.icon} {status.label}
                    </span>
                  </button>
                );
              })
            )}
          </motion.div>
        )}

        <button 
          onClick={onSettings}
          className={`w-full flex items-center justify-between p-4 rounded-2xl shadow-sm border transition-all active:scale-95 ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
              <SettingsIcon className="w-5 h-5" />
            </div>
            <span className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('profile.settings', lang)}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>

        <button 
          onClick={handleLogout}
          className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-95 ${
            isDark ? 'bg-red-900/10 border-red-900/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-red-900/30' : 'bg-red-100'}`}>
              <LogOut className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm">{t('profile.logout', lang)}</span>
          </div>
        </button>
      </div>
    </motion.div>
  );
}
