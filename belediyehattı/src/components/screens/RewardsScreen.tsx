import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Gift, Star, Clock, CheckCircle2, Ticket, AlertCircle, RefreshCw } from 'lucide-react';
import {
  fetchRewards,
  fetchRedeemedRewards,
  redeemReward,
  getMyProfile,
  resolveMediaUrl,
  type ApiReward,
  type ApiRedeemedReward,
  type PublicTenant,
} from '../../api';
import { Lang, t } from '../../i18n';

interface RewardsScreenProps {
  lang: Lang;
  isDark: boolean;
  municipality: PublicTenant | null;
  onBack: () => void;
}

export default function RewardsScreen({ lang, isDark, municipality, onBack }: RewardsScreenProps) {
  const [activeTab, setActiveTab] = useState<'available' | 'mycodes'>('available');
  const [rewards, setRewards] = useState<ApiReward[]>([]);
  const [redeemed, setRedeemed] = useState<ApiRedeemedReward[]>([]);
  const [points, setPoints] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Success Modal State
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [newRedeemed, setNewRedeemed] = useState<ApiRedeemedReward | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [municipality]);

  const loadData = async () => {
    if (!municipality?.id) {
      setLoading(false);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const [profileResult, rewardsResult, redeemedResult] = await Promise.allSettled([
        getMyProfile(),
        fetchRewards(municipality.id),
        fetchRedeemedRewards(),
      ]);

      if (profileResult.status === 'fulfilled') {
        setPoints(profileResult.value.reputationScore ?? 100);
      }
      if (rewardsResult.status === 'fulfilled') {
        setRewards(rewardsResult.value || []);
      }
      if (redeemedResult.status === 'fulfilled') {
        setRedeemed(redeemedResult.value || []);
      }
    } catch (err) {
      console.error(err);
      setError(lang === 'tr' ? 'Veriler yüklenemedi.' : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (reward: ApiReward) => {
    if (points < reward.pointCost) {
      alert(t('rewards.insufficient', lang));
      return;
    }

    if (!window.confirm(lang === 'tr' ? `"${reward.title}" ödülünü almak için ${reward.pointCost} puan harcamak istediğinize emin misiniz?` : `Are you sure you want to spend ${reward.pointCost} points for "${reward.title}"?`)) {
      return;
    }

    setRedeemingId(reward.id);
    try {
      const result = await redeemReward(reward.id);
      setNewRedeemed(result);
      setSuccessModalOpen(true);
      // Reload profile points & lists
      const profile = await getMyProfile().catch(() => null);
      if (profile) setPoints(profile.reputationScore ?? 100);
      const [newRewards, newRedeemedList] = await Promise.all([
        fetchRewards(municipality!.id),
        fetchRedeemedRewards(),
      ]);
      setRewards(newRewards);
      setRedeemed(newRedeemedList);
    } catch (err: any) {
      alert(err.message || (lang === 'tr' ? 'Ödül alınırken hata oluştu.' : 'Failed to redeem reward.'));
    } finally {
      setRedeemingId(null);
    }
  };

  const activeBadgeColor = (status: string) => {
    switch (status) {
      case 'CLAIMED':
        return isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200';
      default:
        return isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b p-4 ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
        <button type="button" onClick={onBack} className={`-ml-2 p-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className={`text-base font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {t('rewards.title', lang)}
        </h2>
        <button onClick={loadData} className={`p-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Point Balance Banner */}
      <div className="p-5 bg-gradient-to-tr from-primary to-indigo-800 text-white relative overflow-hidden shadow-inner">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-28 h-28 rounded-full bg-white/5 blur-xl" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
          {t('rewards.points', lang)}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-3xl font-extrabold tracking-tight">{points}</span>
          <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
        </div>
        <p className="text-[10px] text-slate-300 mt-2 font-medium">
          {lang === 'tr' ? 'Çözülen ihbar ve anketlerle puanlarınızı artırabilirsiniz.' : 'Earn more points by participating in surveys and solving reports.'}
        </p>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 text-center py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'available'
              ? 'border-primary text-primary dark:text-sky-400'
              : 'border-transparent text-slate-500'
          }`}
        >
          {t('rewards.tab.available', lang)}
        </button>
        <button
          onClick={() => setActiveTab('mycodes')}
          className={`flex-1 text-center py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'mycodes'
              ? 'border-primary text-primary dark:text-sky-400'
              : 'border-transparent text-slate-500'
          }`}
        >
          {t('rewards.tab.mycodes', lang)}
        </button>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <span className="text-xs text-slate-400 font-bold tracking-wider">{t('loading', lang)}</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-600 dark:border-red-950/20 dark:bg-red-950/30 dark:text-red-400 flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : activeTab === 'available' ? (
          <div className="space-y-4">
            {rewards.map((reward) => {
              const hasEnoughPoints = points >= reward.pointCost;
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
                        <Star className="h-3.5 w-3.5 fill-primary/10" /> {t('rewards.cost', lang, { n: reward.pointCost })}
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
                      {hasStock ? t('rewards.stock', lang, { n: reward.stock }) : t('rewards.stock.empty', lang)}
                    </span>

                    <button
                      type="button"
                      disabled={!hasEnoughPoints || !hasStock || redeemingId !== null}
                      onClick={() => handleRedeem(reward)}
                      className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/20 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all cursor-pointer hover:brightness-105"
                    >
                      {redeemingId === reward.id ? '...' : t('rewards.redeem.btn', lang)}
                    </button>
                  </div>
                </div>
              );
            })}

            {rewards.length === 0 && (
              <div className="text-center py-16">
                <Gift className="h-10 w-10 text-slate-350 mx-auto mb-3" />
                <p className="text-xs text-slate-500 font-semibold">{t('rewards.empty', lang)}</p>
              </div>
            )}
          </div>
        ) : (
          /* Redeemed Tickets List */
          <div className="space-y-3">
            {redeemed.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => {
                  setNewRedeemed(ticket);
                  setSuccessModalOpen(true);
                }}
                className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all active:scale-[0.99] cursor-pointer ${
                  isDark ? 'border-slate-800 bg-slate-900 hover:bg-slate-900/80' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-250">
                      {ticket.redemptionCode}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[8px] font-bold ${activeBadgeColor(ticket.status)}`}>
                      {ticket.status === 'REDEEMED'
                        ? t('rewards.status.REDEEMED', lang)
                        : ticket.status === 'CLAIMED'
                          ? t('rewards.status.CLAIMED', lang)
                          : t('rewards.status.CANCELLED', lang)}
                    </span>
                  </div>
                  <p className={`text-xs font-bold truncate mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {ticket.rewardTitle}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {ticket.redeemedAt ? new Date(ticket.redeemedAt).toLocaleDateString('tr-TR') : ''}
                  </p>
                </div>
              </div>
            ))}

            {redeemed.length === 0 && (
              <div className="text-center py-16">
                <Ticket className="h-10 w-10 text-slate-350 mx-auto mb-3" />
                <p className="text-xs text-slate-500 font-semibold">{t('rewards.mycodes.empty', lang)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ticket Success Detail Modal */}
      <AnimatePresence>
        {successModalOpen && newRedeemed && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl text-center transition-all ${
                isDark ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'
              }`}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-inner">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              
              <h3 className="text-base font-extrabold tracking-tight">
                {t('rewards.redeem.success', lang)}
              </h3>
              
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {newRedeemed.rewardTitle}
              </p>

              {/* Redemption code display card */}
              <div className={`mt-5 p-4 rounded-2xl border flex flex-col items-center justify-center ${
                isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/50'
              }`}>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('rewards.code', lang)}</span>
                <span className="text-xl font-mono font-extrabold tracking-wider text-primary dark:text-sky-300 mt-1 select-all">
                  {newRedeemed.redemptionCode}
                </span>

                {/* Styled dummy QR Code for visual ticket feedback */}
                <div className="bg-white p-2.5 rounded-2xl shadow-md mt-4 flex items-center justify-center">
                  <svg className="w-28 h-28 text-slate-900" viewBox="0 0 100 100">
                    {/* Standard visual QR blocks */}
                    <rect width="25" height="25" fill="currentColor"/>
                    <rect x="5" y="5" width="15" height="15" fill="white"/>
                    <rect x="9" y="9" width="7" height="7" fill="currentColor"/>

                    <rect x="75" width="25" height="25" fill="currentColor"/>
                    <rect x="80" y="5" width="15" height="15" fill="white"/>
                    <rect x="84" y="9" width="7" height="7" fill="currentColor"/>

                    <rect y="75" width="25" height="25" fill="currentColor"/>
                    <rect x="5" y="80" width="15" height="15" fill="white"/>
                    <rect x="9" y="84" width="7" height="7" fill="currentColor"/>

                    {/* Dummy center blocks */}
                    <rect x="35" y="10" width="10" height="25" fill="currentColor"/>
                    <rect x="55" y="5" width="12" height="12" fill="currentColor"/>
                    <rect x="30" y="45" width="20" height="10" fill="currentColor"/>
                    <rect x="65" y="35" width="20" height="20" fill="currentColor"/>
                    <rect x="30" y="65" width="10" height="30" fill="currentColor"/>
                    <rect x="45" y="80" width="20" height="10" fill="currentColor"/>
                    <rect x="50" y="55" width="15" height="15" fill="currentColor"/>
                    <rect x="75" y="70" width="20" height="20" fill="currentColor"/>
                  </svg>
                </div>
              </div>

              <p className="mt-4 text-[10px] leading-relaxed text-slate-400 font-medium">
                {t('rewards.redeem.desc', lang)}
              </p>

              <button
                type="button"
                onClick={() => setSuccessModalOpen(false)}
                className="mt-6 w-full rounded-2xl bg-primary py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                {lang === 'tr' ? 'Kapat' : 'Close'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
