import { useState, useEffect } from 'react';

import { motion } from 'motion/react';

import { Building2, ChevronRight, ClipboardList } from 'lucide-react';

import {

  getMyReports,

  fetchPublicStatsOverview,

  type PublicStatsOverview,

  type PublicTenant,

} from '../../api';

import { Lang, t } from '../../i18n';

import HomeWidgets from '../home/HomeWidgets';



const MY_REPORTS_PREVIEW_SIZE = 3;



interface HomeProps {

  onViewMyReports: () => void;

  onSelectMunicipality?: () => void;

  lang: Lang;

  isDark: boolean;

  homeMunicipality?: PublicTenant | null;

}



export default function Home({

  onViewMyReports,

  onSelectMunicipality,

  lang,

  isDark,

  homeMunicipality,

}: HomeProps) {

  const [totalMyReports, setTotalMyReports] = useState(0);

  const [previewTitles, setPreviewTitles] = useState<string[]>([]);

  const [reportsLoading, setReportsLoading] = useState(true);

  const [publicOverview, setPublicOverview] = useState<PublicStatsOverview | null>(null);



  useEffect(() => {

    let cancelled = false;

    (async () => {

      setReportsLoading(true);

      try {

        const [rep, overview] = await Promise.all([

          getMyReports(0, MY_REPORTS_PREVIEW_SIZE).catch(() => ({ content: [], totalElements: 0 })),

          fetchPublicStatsOverview().catch(() => null),

        ]);

        if (cancelled) return;

        setTotalMyReports(rep.totalElements ?? (rep.content || []).length);

        setPreviewTitles((rep.content || []).map((r) => r.title).filter(Boolean));

        setPublicOverview(overview);

      } finally {

        if (!cancelled) setReportsLoading(false);

      }

    })();

    return () => {

      cancelled = true;

    };

  }, []);



  const card = isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white';

  const muted = isDark ? 'text-slate-400' : 'text-slate-500';



  const reportsCard = (

    <button

      type="button"

      onClick={onViewMyReports}

      className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${

        isDark

          ? 'border-primary/30 bg-primary/10 hover:border-primary/40'

          : 'border-primary/15 bg-white shadow-sm hover:border-primary/25'

      }`}

    >

      <motion.div className="flex items-center gap-3">

        <motion.div

          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${

            isDark ? 'bg-primary/25 text-sky-300' : 'bg-primary/10 text-primary'

          }`}

        >

          <ClipboardList className="h-5 w-5" />

        </motion.div>

        <motion.div className="min-w-0 flex-1">

          <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>

            {t('home.reports.cardTitle', lang)}

          </p>

          {reportsLoading ? (

            <p className={`mt-0.5 text-xs ${muted}`}>…</p>

          ) : (

            <>

              <p className={`mt-0.5 text-xs ${muted}`}>

                {t('home.reports.count', lang, { n: totalMyReports })}

              </p>

              {previewTitles.length > 0 && (

                <p className={`mt-1 truncate text-[11px] ${muted}`}>{previewTitles[0]}</p>

              )}

            </>

          )}

        </motion.div>

        <motion.div className="flex shrink-0 flex-col items-end gap-0.5">

          <span className="text-xs font-bold text-primary">{t('home.reports.viewAll', lang)}</span>

          <ChevronRight className="h-4 w-4 text-primary" />

        </motion.div>

      </motion.div>

    </button>

  );



  return (

    <motion.div

      initial={{ opacity: 0 }}

      animate={{ opacity: 1 }}

      className={`pb-8 ${isDark ? 'bg-slate-900' : 'bg-gradient-to-b from-sky-50/80 via-violet-50/25 to-slate-50'}`}

    >

      {!homeMunicipality?.id ? (

        <div className="px-4 pt-4">

          <motion.div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10">

            <motion.div className="flex gap-3">

              <motion.div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">

                <Building2 className="h-6 w-6" />

              </motion.div>

              <motion.div className="min-w-0 flex-1">

                <p className="text-sm font-bold text-slate-900 dark:text-white">

                  {t('home.municipalityBanner.title', lang)}

                </p>

                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">

                  {t('home.municipalityBanner.desc', lang)}

                </p>

                {onSelectMunicipality ? (

                  <button

                    type="button"

                    onClick={onSelectMunicipality}

                    className="mt-3 inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white active:scale-[0.98]"

                  >

                    {t('home.selectMunicipality', lang)}

                    <ChevronRight className="h-4 w-4" />

                  </button>

                ) : null}

              </motion.div>

            </motion.div>

          </motion.div>

        </div>

      ) : (

        <div className="space-y-4 px-4 pt-4">

          {reportsCard}

          <HomeWidgets tenant={homeMunicipality} lang={lang} isDark={isDark} />

        </div>

      )}



      {publicOverview && (

        <div className="mt-5 px-4">

          <div className="flex gap-2 overflow-x-auto scrollbar-hide">

            <div className={`shrink-0 rounded-xl border px-3 py-2 ${card}`}>

              <p className="text-[9px] font-bold uppercase text-slate-400">{t('home.public.total', lang)}</p>

              <p className="text-base font-extrabold tabular-nums">{publicOverview.totalReports}</p>

            </div>

            <div className={`shrink-0 rounded-xl border px-3 py-2 ${card}`}>

              <p className="text-[9px] font-bold uppercase text-slate-400">{t('home.public.resolved', lang)}</p>

              <p className="text-base font-extrabold tabular-nums text-emerald-600">{publicOverview.resolvedReports}</p>

            </div>

            <div className={`shrink-0 rounded-xl border px-3 py-2 ${card}`}>

              <p className="text-[9px] font-bold uppercase text-slate-400">{t('home.public.rate', lang)}</p>

              <p className="text-base font-extrabold tabular-nums text-primary">%{publicOverview.resolutionRatePercent}</p>

            </div>

          </div>

        </div>

      )}

    </motion.div>

  );

}

