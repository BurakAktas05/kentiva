import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, BarChart3, CheckCircle2, Award, Users, Check, Loader2 } from 'lucide-react';
import { getPublicSurveys, voteSurvey, type ApiSurvey, type PublicTenant, getMyProfile } from '../../api';
import { Lang, t } from '../../i18n';
import { kentivaCard, sectionHintClass, sectionTitleClass } from '../../lib/ui';

interface SurveysProps {
  municipality: PublicTenant | null;
  lang: Lang;
  isDark: boolean;
  onBack?: () => void;
  embedded?: boolean;
  /** Ana sayfada kompakt blok */
  homeSection?: boolean;
  onReputationChange?: (score: number) => void;
}

export default function Surveys({
  municipality,
  lang,
  isDark,
  onBack,
  embedded,
  homeSection,
  onReputationChange,
}: SurveysProps) {
  const [surveys, setSurveys] = useState<ApiSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSurveys();
  }, [municipality]);

  const loadSurveys = () => {
    if (!municipality?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getPublicSurveys(municipality.id)
      .then((res) => {
        setSurveys(res || []);
      })
      .catch((err) => {
        console.error('Anketler yuklenirken hata:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleSelectOption = (surveyId: string, optionNumber: number) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [surveyId]: optionNumber,
    }));
  };

  const handleVote = async (surveyId: string) => {
    const selectedOption = selectedOptions[surveyId];
    if (!selectedOption) return;

    setVotingId(surveyId);
    try {
      const updated = await voteSurvey(surveyId, selectedOption);
      
      // Update local survey state
      setSurveys((prev) => prev.map((s) => (s.id === surveyId ? updated : s)));
      
      // Notify about reputation increase if profile update callback provided
      if (onReputationChange) {
        getMyProfile().then((profile) => {
          if (profile?.reputationScore) {
            onReputationChange(profile.reputationScore);
          }
        });
      }

      setSuccessMessage(t('surveys.success.vote', lang));
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Oy verilirken bir hata olustu.');
    } finally {
      setVotingId(null);
    }
  };

  const displaySurveys = useMemo(() => {
    const sorted = [...surveys].sort((a, b) => {
      const aRec = a.recommended && !a.voted;
      const bRec = b.recommended && !b.voted;
      if (aRec && !bRec) return -1;
      if (!aRec && bRec) return 1;
      return 0;
    });
    return homeSection ? sorted.slice(0, 2) : sorted;
  }, [surveys, homeSection]);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={homeSection ? 'pb-2' : 'pb-8'}>
      {homeSection && municipality?.id && (
        <div className="px-4 mb-2 flex items-end justify-between gap-2">
          <div>
            <h3 className={sectionTitleClass()}>{t('home.surveys.title', lang)}</h3>
            <p className={sectionHintClass()}>{t('home.surveys.hint', lang)}</p>
          </div>
        </div>
      )}
      {!embedded && !homeSection && onBack && (
        <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <button type="button" onClick={onBack} className="-ml-2 p-2 text-slate-500 dark:text-slate-400">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('surveys.title', lang)}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('surveys.subtitle', lang)}</p>
          </div>
        </div>
      )}

      <div className={`space-y-4 ${embedded || homeSection ? 'px-4' : 'p-4'}`}>
        {/* Success Alert Banner */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-xs font-bold"
            >
              <Award className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-4 pt-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800/40" />
            ))}
          </div>
        ) : displaySurveys.length === 0 ? (
          homeSection ? null : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('surveys.empty', lang)}</p>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {displaySurveys.map((survey) => {
              const hasVoted = survey.voted;
              const selectedOption = selectedOptions[survey.id];
              const totalVotes = survey.totalVotes || 0;

              // Helper to calculate percentages
              const getPercentage = (count: number) => {
                if (totalVotes === 0) return 0;
                return Math.round((count / totalVotes) * 100);
              };

              const options = [
                { num: 1, text: survey.option1, count: survey.option1Count },
                { num: 2, text: survey.option2, count: survey.option2Count },
                ...(survey.option3 ? [{ num: 3, text: survey.option3, count: survey.option3Count }] : []),
                ...(survey.option4 ? [{ num: 4, text: survey.option4, count: survey.option4Count }] : []),
              ];

              return (
                <motion.div
                  key={survey.id}
                  layout
                  className={kentivaCard(
                    isDark,
                    hasVoted
                      ? 'opacity-90'
                      : survey.recommended
                      ? 'ring-2 ring-amber-500/50 dark:ring-amber-400/50 bg-amber-50/5 dark:bg-amber-950/5 shadow-md shadow-amber-500/5'
                      : ''
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        <BarChart3 className="h-3 w-3" />
                        {hasVoted ? t('surveys.voted', lang) : t('surveys.municipality.badge', lang)}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        {survey.category || 'Genel'}
                      </span>
                      {survey.recommended && !survey.voted && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                          ✨ Önerilen
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                      <Users className="h-3.5 w-3.5" />
                      <span>{t('surveys.total.votes', lang).replace('{n}', String(totalVotes))}</span>
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <h3 className={`mt-3 font-semibold text-slate-900 dark:text-white leading-snug ${homeSection ? 'text-sm' : 'text-base'}`}>
                    {survey.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {survey.description}
                  </p>

                  {/* Options List */}
                  <div className="mt-5 space-y-2.5">
                    {options.map((opt) => {
                      const percent = getPercentage(opt.count);
                      const isOptionSelected = selectedOption === opt.num;
                      const isVotedThis = survey.votedOption === opt.num;

                      if (hasVoted) {
                        return (
                          <div
                            key={opt.num}
                            className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-500 ${
                              isVotedThis
                                ? isDark
                                  ? 'border-emerald-500/30 bg-emerald-950/20'
                                  : 'border-emerald-200 bg-emerald-50/50'
                                : isDark
                                ? 'border-slate-800/80 bg-slate-950/40'
                                : 'border-slate-100 bg-slate-100/30'
                            }`}
                          >
                            {/* Animated Background Bar */}
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percent}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className={`absolute inset-y-0 left-0 -z-10 ${
                                isVotedThis
                                  ? 'bg-emerald-500/10 dark:bg-emerald-500/20'
                                  : 'bg-slate-200/50 dark:bg-slate-800/60'
                              }`}
                            />

                            {/* Content */}
                            <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-2">
                                {isVotedThis && (
                                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0" />
                                )}
                                <span
                                  className={`text-xs font-bold ${
                                    isVotedThis
                                      ? 'text-emerald-700 dark:text-emerald-400'
                                      : 'text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {opt.text}
                                </span>
                              </div>
                              <span
                                className={`text-xs font-extrabold ${
                                  isVotedThis
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {percent}%
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // Active state before voting
                      return (
                        <button
                          key={opt.num}
                          type="button"
                          onClick={() => handleSelectOption(survey.id, opt.num)}
                          className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${
                            isOptionSelected
                              ? 'border-primary bg-primary/10 dark:border-secondary dark:bg-primary/20 shadow-md shadow-primary/5'
                              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/50'
                          }`}
                        >
                          <span
                            className={`text-xs font-bold ${
                              isOptionSelected ? 'text-primary dark:text-secondary' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {opt.text}
                          </span>
                          <div
                            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
                              isOptionSelected
                                ? 'border-primary bg-primary text-white dark:border-secondary dark:bg-secondary'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isOptionSelected && <Check className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Vote Button */}
                  {!hasVoted && (
                    <button
                      type="button"
                      disabled={!selectedOption || votingId === survey.id}
                      onClick={() => handleVote(survey.id)}
                      className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-extrabold shadow-lg transition-all ${
                        selectedOption
                          ? 'bg-primary text-white shadow-primary/20 hover:brightness-105 active:scale-[0.99]'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {votingId === survey.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{lang === 'tr' ? 'Oyunuz Kaydediliyor...' : 'Saving Vote...'}</span>
                        </>
                      ) : (
                        <>
                          <span>{t('surveys.vote.btn', lang)}</span>
                        </>
                      )}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
