import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Award, Star, TrendingUp, Info, CheckCircle, ShieldAlert, Sparkles, UserCheck, Gift, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  getMyProfile,
  getSavedUser,
  fetchRewards,
  redeemReward,
  resolveMediaUrl,
  type ApiUserProfile,
  type ApiReward,
  type PublicTenant,
} from '../../api';
import { Lang, t } from '../../i18n';
import { screenBg, detailHeaderBar, detailBackBtnClass, detailTitleClass, kentivaCard } from '../../lib/ui';

interface RanksScreenProps {
  lang: Lang;
  isDark: boolean;
  municipality?: PublicTenant | null;
  onBack: () => void;
}

export default function RanksScreen({ lang, isDark, municipality, onBack }: RanksScreenProps) {
  const [activeSegment, setActiveSegment] = useState<'ranks' | 'rewards'>('ranks');
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Rewards states
  const [rewards, setRewards] = useState<ApiReward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsError, setRewardsError] = useState('');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [lang]);

  useEffect(() => {
    if (activeSegment === 'rewards' && municipality?.id) {
      void loadRewards();
    }
  }, [activeSegment, municipality]);

  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const data = await getMyProfile();
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile in RanksScreen:', err);
      const saved = getSavedUser();
      if (saved) {
        setProfile({
          id: saved.userId,
          email: saved.email,
          firstName: saved.fullName.split(' ')[0] || '',
          lastName: saved.fullName.split(' ').slice(1).join(' ') || '',
          phoneNumber: null,
          roles: saved.roles || [],
          reputationScore: 100,
          reputationLevel: lang === 'tr' ? 'Yeni Üye' : 'New member',
        });
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const loadRewards = async () => {
    if (!municipality?.id) return;
    setRewardsError('');
    setRewardsLoading(true);
    try {
      const data = await fetchRewards(municipality.id);
      setRewards(data || []);
    } catch (err) {
      console.error(err);
      setRewardsError(lang === 'tr' ? 'Ödüller yüklenemedi.' : 'Failed to load rewards.');
    } finally {
      setRewardsLoading(false);
    }
  };

  const handleRedeem = async (reward: ApiReward) => {
    const userPoints = score;
    if (userPoints < reward.pointCost) {
      alert(t('rewards.insufficient', lang));
      return;
    }

    if (!window.confirm(lang === 'tr' ? `"${reward.title}" ödülünü almak için ${reward.pointCost} puan harcamak istediğinize emin misiniz?` : `Are you sure you want to spend ${reward.pointCost} points for "${reward.title}"?`)) {
      return;
    }

    setRedeemingId(reward.id);
    try {
      await redeemReward(reward.id);
      alert(lang === 'tr' ? 'Ödül başarıyla alındı! Kupon kodunuz sisteme kaydedildi.' : 'Reward claimed successfully!');
      
      // Reload profile points & lists
      const updatedProfile = await getMyProfile().catch(() => null);
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
      void loadRewards();
    } catch (err: any) {
      alert(err.message || (lang === 'tr' ? 'Ödül alınırken hata oluştu.' : 'Failed to redeem reward.'));
    } finally {
      setRedeemingId(null);
    }
  };

  const score = profile?.reputationScore ?? 100;
  const currentLevelName = profile?.reputationLevel ?? (lang === 'tr' ? 'Yeni Üye' : 'New Member');

  // Ranks configuration
  const ranks = [
    {
      level: 5,
      name: t('ranks.level.hero', lang),
      minScore: 800,
      description: lang === 'tr' ? 'Şehrin en aktif koruyucusu ve en saygın vatandaşı!' : 'The most active guardian and respected citizen of the city!',
      color: 'from-amber-500 to-yellow-400 dark:from-amber-600 dark:to-yellow-500',
      textColor: 'text-amber-600 dark:text-amber-400',
      bgLight: 'bg-amber-50 dark:bg-amber-950/20',
      borderClass: 'border-amber-200 dark:border-amber-900/50'
    },
    {
      level: 4,
      name: t('ranks.level.volunteer', lang),
      minScore: 500,
      description: lang === 'tr' ? 'Şehirdeki sorunların çözümünde sürekli katkı sağlayan gönüllü.' : 'A volunteer who continuously contributes to solving city issues.',
      color: 'from-purple-500 to-indigo-500 dark:from-purple-600 dark:to-indigo-600',
      textColor: 'text-purple-600 dark:text-purple-400',
      bgLight: 'bg-purple-50 dark:bg-purple-950/20',
      borderClass: 'border-purple-200 dark:border-purple-900/50'
    },
    {
      level: 3,
      name: t('ranks.level.citizen', lang),
      minScore: 250,
      description: lang === 'tr' ? 'Şehir sorunlarına karşı duyarlı ve aktif olarak katılan hemşehrimiz.' : 'Sensitized and actively participating citizen of the city.',
      color: 'from-sky-500 to-blue-500 dark:from-sky-600 dark:to-blue-600',
      textColor: 'text-sky-600 dark:text-sky-400',
      bgLight: 'bg-sky-50 dark:bg-sky-950/20',
      borderClass: 'border-sky-200 dark:border-sky-900/50'
    },
    {
      level: 2,
      name: t('ranks.level.trusted', lang),
      minScore: 100,
      description: lang === 'tr' ? 'Doğrulanmış ve sisteme faydalı katkılar sunan güvenilir üye.' : 'A trusted member who provides verified and helpful contributions.',
      color: 'from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/20',
      borderClass: 'border-emerald-200 dark:border-emerald-900/50'
    },
    {
      level: 1,
      name: t('ranks.level.new', lang),
      minScore: 0,
      description: lang === 'tr' ? 'Kentiva ailesine yeni katılmış çiçeği burnunda üye.' : 'A fresh member who just joined the Kentiva family.',
      color: 'from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700',
      textColor: 'text-slate-500 dark:text-slate-400',
      bgLight: 'bg-slate-50 dark:bg-slate-900/20',
      borderClass: 'border-slate-200 dark:border-slate-800'
    }
  ];

  // Point rules details
  const points = {
    create: municipality?.reputationDeltaReportCreated ?? 25,
    resolve: municipality?.reputationDeltaReportResolved ?? 50,
    survey: 15,
    reject: municipality?.reputationDeltaReportRejected ?? -45,
    selfie: municipality?.reputationDeltaInappropriateMedia ?? -70,
  };

  const formatVal = (v: number) => {
    return v >= 0 ? `+${v}` : `${v}`;
  };

  const rules = [
    { label: t('ranks.rule.create', lang), val: formatVal(points.create), type: points.create >= 0 ? 'plus' : 'minus', desc: lang === 'tr' ? 'Her yeni sorun bildiriminde' : 'For each new issue report' },
    { label: t('ranks.rule.resolve', lang), val: formatVal(points.resolve), type: points.resolve >= 0 ? 'plus' : 'minus', desc: lang === 'tr' ? 'İhbarınız çözüldüğünde' : 'When your report is resolved' },
    { label: t('ranks.rule.survey', lang), val: formatVal(points.survey), type: points.survey >= 0 ? 'plus' : 'minus', desc: lang === 'tr' ? 'Anket oylamasına katılımda' : 'For participating in surveys' },
    { label: t('ranks.rule.reject', lang), val: formatVal(points.reject), type: points.reject >= 0 ? 'plus' : 'minus', desc: lang === 'tr' ? 'Asılsız/kötü niyetli ihbarlarda' : 'For false or malicious reports' },
    { label: t('ranks.rule.selfie', lang), val: formatVal(points.selfie), type: points.selfie >= 0 ? 'plus' : 'minus', desc: lang === 'tr' ? 'Selfie veya uygunsuz resim yüklemede' : 'For selfie or inappropriate photo uploads' },
  ];

  // Calculate progress to next level
  const currentRankIndex = ranks.findIndex(r => score >= r.minScore);
  const currentRank = ranks[currentRankIndex] || ranks[ranks.length - 1];
  const nextRank = currentRankIndex > 0 ? ranks[currentRankIndex - 1] : null;

  let progressPercent = 100;
  let pointsNeeded = 0;

  if (nextRank) {
    const range = nextRank.minScore - currentRank.minScore;
    const currentOffset = score - currentRank.minScore;
    progressPercent = Math.min(100, Math.max(0, (currentOffset / range) * 100));
    pointsNeeded = nextRank.minScore - score;
  }

  return (
    <div className={`min-h-full flex flex-col ${screenBg(isDark)} pb-8`}>
      <header className={detailHeaderBar(isDark)}>
        <button
          type="button"
          onClick={onBack}
          className={detailBackBtnClass(isDark)}
          aria-label={t('settings.back', lang)}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className={detailTitleClass(isDark)}>
          {lang === 'tr' ? 'Rütbe & Ödüller' : 'Ranks & Rewards'}
        </h1>
      </header>

      {/* Tab/Segment selector */}
      <div className={`px-4 py-2 border-b shrink-0 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
        <div className="flex gap-1.5 p-1 bg-slate-200/50 dark:bg-slate-950 rounded-xl">
          <button
            onClick={() => setActiveSegment('ranks')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSegment === 'ranks'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
            }`}
          >
            {lang === 'tr' ? 'Rütbe Sistemi' : 'Rank System'}
          </button>
          <button
            onClick={() => setActiveSegment('rewards')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSegment === 'rewards'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
            }`}
          >
            {lang === 'tr' ? 'Ödüller' : 'Rewards'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* User XP & Level Overview Card */}
        {profileLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl border border-white/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-primary/20 blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr ${currentRank.color} text-white shadow-lg`}>
                <Award className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400 dark:text-sky-300">
                  {t('ranks.level', lang)}
                </p>
                <h2 className="text-lg font-extrabold tracking-tight mt-0.5">
                  {currentLevelName}
                </h2>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">XP / SCORE</span>
                <span className="text-sm font-extrabold text-white flex items-center gap-1">
                  {score} <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                </span>
              </div>
              <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-sky-400 to-indigo-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {nextRank ? (
                <p className="text-[10px] font-medium text-sky-200 mt-2 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />
                  {lang === 'tr' 
                    ? `Bir sonraki rütbe (${nextRank.name}) için ${pointsNeeded} puan daha gerekiyor.`
                    : `${pointsNeeded} more points needed to unlock the next rank (${nextRank.name}).`}
                </p>
              ) : (
                <p className="text-[10px] font-medium text-emerald-300 mt-2 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {lang === 'tr' ? 'En yüksek rütbeye ulaştınız!' : 'You have reached the maximum rank!'}
                </p>
              )}
            </div>
          </div>
        )}

        {activeSegment === 'ranks' ? (
          <>
            {/* How Ranks Work Section */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <TrendingUp className="h-4 w-4 text-primary dark:text-sky-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  {t('ranks.thresholds', lang)}
                </h3>
              </div>

              <div className="space-y-3">
                {ranks.map((r) => {
                  const isUserRank = score >= r.minScore && (ranks.findIndex(x => score >= x.minScore) === ranks.indexOf(r));
                  return (
                    <div 
                      key={r.level} 
                      className={`rounded-2xl border p-4 flex gap-3.5 transition-all ${
                        isUserRank 
                          ? 'border-primary bg-primary/5 dark:border-sky-500/30 dark:bg-sky-500/5' 
                          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60'
                      }`}
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${r.color} text-white shadow-sm`}>
                        <Award className="h-6 w-6" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                            {r.name}
                          </h4>
                          <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full shrink-0 ${
                            isUserRank 
                              ? 'bg-primary text-white dark:bg-sky-500' 
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {r.minScore}+
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1 font-medium">
                          {r.description}
                        </p>
                        {isUserRank && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase text-primary dark:text-sky-400 mt-2 bg-primary/10 dark:bg-sky-500/10 px-2 py-0.5 rounded-md">
                            <UserCheck className="h-3 w-3" /> {lang === 'tr' ? 'Mevcut Seviyeniz' : 'Current Level'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Scoring Rules Section */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Info className="h-4 w-4 text-primary dark:text-sky-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  {t('ranks.rules', lang)}
                </h3>
              </div>

              <div className={kentivaCard(isDark, 'divide-y divide-slate-100 dark:divide-slate-800/80 p-0 overflow-hidden')}>
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start justify-between p-4 gap-4">
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-slate-800 dark:text-white">
                        {rule.label}
                      </span>
                      <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                        {rule.desc}
                      </span>
                    </div>
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
                      rule.type === 'plus' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' 
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400'
                    }`}>
                      {rule.val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Ban Warning Panel */}
              <div className="flex gap-3 rounded-2xl border border-rose-200/50 bg-rose-50/30 p-4 dark:border-rose-950/30 dark:bg-rose-950/10">
                <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-left">
                  <span className="block text-xs font-bold text-rose-800 dark:text-rose-400">
                    {lang === 'tr' ? 'Önemli Uyarı: Askıya Alınma Politikası' : 'Important Notice: Suspension Policy'}
                  </span>
                  <span className="block text-[10px] text-rose-600 dark:text-rose-500 leading-relaxed font-semibold mt-1">
                    {lang === 'tr'
                      ? `${municipality?.autoSuspensionDays ?? 30} gün içerisinde ${municipality?.autoSuspensionThreshold ?? 5} veya daha fazla asılsız, uygunsuz ya da spam ihbar kaydı oluşturmanız durumunda, hesabınız otomatik olarak askıya alınır ve bildirim haklarınız elinizden alınır.`
                      : `If you create ${municipality?.autoSuspensionThreshold ?? 5} or more fake, inappropriate or spam reports within ${municipality?.autoSuspensionDays ?? 30} days, your account will be suspended automatically and your reporting rights will be revoked.`}
                  </span>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* Available Rewards Section */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Gift className="h-4 w-4 text-primary" />
                {lang === 'tr' ? 'Belediye Ödülleri' : 'Municipality Rewards'}
              </h3>
              <button onClick={loadRewards} className="text-xs text-primary dark:text-sky-300 font-bold flex items-center gap-1">
                <RefreshCw className={`h-3 w-3 ${rewardsLoading ? 'animate-spin' : ''}`} />
                {lang === 'tr' ? 'Yenile' : 'Refresh'}
              </button>
            </div>

            {rewardsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-slate-400 font-bold">{lang === 'tr' ? 'Ödüller yükleniyor...' : 'Loading rewards...'}</p>
              </div>
            ) : rewardsError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-600 dark:border-red-950/20 dark:bg-red-950/30 dark:text-red-400 flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{rewardsError}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {rewards.map((reward) => {
                  const hasEnoughPoints = score >= reward.pointCost;
                  const hasStock = reward.stock > 0;
                  return (
                    <div
                      key={reward.id}
                      className={`rounded-2xl border overflow-hidden transition-all duration-300 shadow-sm flex flex-col justify-between ${
                        isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex p-4 gap-4">
                        {/* Reward Image */}
                        <div className={`w-20 h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center ${
                          isDark ? 'bg-slate-950' : 'bg-slate-100'
                        }`}>
                          {reward.imageUrl ? (
                            <img src={resolveMediaUrl(reward.imageUrl)} alt={reward.title} className="h-full w-full object-cover" />
                          ) : (
                            <Gift className="h-8 w-8 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="flex items-center gap-1 text-[11px] font-bold text-primary dark:text-sky-300">
                            <Star className="h-3.5 w-3.5 fill-primary/10" /> {reward.pointCost} {lang === 'tr' ? 'Puan' : 'Points'}
                          </span>
                          <h3 className={`text-sm font-bold tracking-tight mt-1 truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {reward.title}
                          </h3>
                          <p className={`text-[11px] mt-1 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {reward.description || '—'}
                          </p>
                        </div>
                      </div>

                      {/* Redeem Action Row */}
                      <div className={`px-4 py-3 border-t flex items-center justify-between gap-3 ${
                        isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/55'
                      }`}>
                        <span className={`text-[10px] font-bold ${
                          hasStock ? 'text-slate-400' : 'text-rose-600'
                        }`}>
                          {hasStock ? (lang === 'tr' ? `Stok: ${reward.stock}` : `Stock: ${reward.stock}`) : (lang === 'tr' ? 'Tükendi' : 'Out of stock')}
                        </span>

                        <button
                          type="button"
                          disabled={!hasEnoughPoints || !hasStock || redeemingId !== null}
                          onClick={() => handleRedeem(reward)}
                          className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/20 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all cursor-pointer hover:brightness-105"
                        >
                          {redeemingId === reward.id ? '...' : (lang === 'tr' ? 'Ödülü Al' : 'Claim')}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {rewards.length === 0 && (
                  <div className="text-center py-16">
                    <Gift className="h-10 w-10 text-slate-350 mx-auto mb-3" />
                    <p className="text-xs text-slate-500 font-semibold">
                      {lang === 'tr' ? 'Belediyeye ait aktif bir hediye bulunmamaktadır.' : 'No active rewards found for this municipality.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
