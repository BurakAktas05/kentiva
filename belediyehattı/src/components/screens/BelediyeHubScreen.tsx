import { useState, type ReactNode } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Gift,
  Headphones,
} from 'lucide-react';
import { type PublicDepartment, type PublicTenant } from '../../api';
import { Lang, t } from '../../i18n';
import {
  detailBackBtnClass,
  detailHeaderBar,
  detailTitleClass,
  screenBg,
  screenHeadingClass,
  screenSubtitleClass,
} from '../../lib/ui';
import { PharmacyWidgetCard } from '../home/HomeWidgets';
import MunicipalitySupportCard from '../MunicipalitySupportCard';
import CityCalendar from './CityCalendar';
import RanksScreen from './RanksScreen';

type DetailView = 'support' | 'ranks' | null;

interface BelediyeHubScreenProps {
  municipality: PublicTenant | null;
  department?: PublicDepartment | null;
  lang: Lang;
  isDark: boolean;
  onSelectMunicipality?: () => void;
}

function DrawerRow({
  isDark,
  icon,
  iconTone,
  title,
  desc,
  onClick,
}: {
  isDark: boolean;
  icon: ReactNode;
  iconTone: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full min-h-14 items-center gap-3 px-3.5 py-3 text-left transition active:scale-[0.99] ${
        isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-50'
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</p>
        <p className={`mt-0.5 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
      </div>
      <ChevronRight className={`h-4 w-4 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
    </button>
  );
}

export default function BelediyeHubScreen({
  municipality,
  department: _department,
  lang,
  isDark,
  onSelectMunicipality,
}: BelediyeHubScreenProps) {
  const [detail, setDetail] = useState<DetailView>(null);
  const [ranksSegment, setRanksSegment] = useState<'ranks' | 'rewards'>('ranks');

  if (detail === 'ranks') {
    return (
      <RanksScreen
        lang={lang}
        isDark={isDark}
        municipality={municipality}
        initialSegment={ranksSegment}
        embedded
        onBack={() => setDetail(null)}
      />
    );
  }

  if (detail === 'support') {
    return (
      <div className={`pb-8 ${screenBg(isDark)}`}>
        <header className={detailHeaderBar(isDark)}>
          <button
            type="button"
            onClick={() => setDetail(null)}
            className={detailBackBtnClass(isDark)}
            aria-label={t('settings.back', lang)}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className={detailTitleClass(isDark)}>
            {lang === 'tr' ? 'İletişim' : lang === 'ar' ? 'تواصل' : 'Contact'}
          </h1>
        </header>
        <div className="px-4 pt-4">
          {municipality?.id ? (
            <MunicipalitySupportCard municipality={municipality} lang={lang} isDark={isDark} />
          ) : (
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('home.municipalityBanner.desc', lang)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`pb-8 ${screenBg(isDark)}`}>
      <div className="px-5 pt-4 pb-3">
        <h2 className={screenHeadingClass(isDark)}>{t('tab.belediye', lang)}</h2>
        <p className={`mt-0.5 ${screenSubtitleClass()}`}>
          {lang === 'tr'
            ? 'Hizmetler ve katılım araçları'
            : lang === 'ar'
              ? 'الخدمات وأدوات المشاركة'
              : 'Services and engagement tools'}
        </p>
      </div>

      {!municipality?.id ? (
        <div className="px-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 dark:border-primary/30 dark:bg-primary/10">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('home.municipalityBanner.title', lang)}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {t('home.municipalityBanner.desc', lang)}
            </p>
            {onSelectMunicipality && (
              <button
                type="button"
                onClick={onSelectMunicipality}
                className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white"
              >
                {t('home.selectMunicipality', lang)}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-4">
          <PharmacyWidgetCard tenant={municipality} lang={lang} isDark={isDark} />

          <div
            className={`overflow-hidden rounded-[24px] border ${
              isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200/90 bg-white'
            }`}
          >
            <CityCalendar municipality={municipality} lang={lang} isDark={isDark} embedded />
          </div>

          {/* Çekmece: diğer detaylar */}
          <div
            className={`overflow-hidden rounded-[24px] border shadow-[0_12px_40px_-28px_rgba(15,23,42,.45)] ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200/90 bg-white'
            }`}
          >
            <div
              className={`flex items-center justify-center border-b px-4 py-2.5 ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <div
                className={`h-1 w-10 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
                aria-hidden
              />
            </div>
            <div className="px-4 pb-1 pt-3">
              <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {lang === 'tr' ? 'Daha fazla' : lang === 'ar' ? 'المزيد' : 'More'}
              </p>
            </div>

            <DrawerRow
              isDark={isDark}
              icon={<Headphones className="h-5 w-5" />}
              iconTone={isDark ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-700'}
              title={lang === 'tr' ? 'İletişim' : lang === 'ar' ? 'تواصل' : 'Contact'}
              desc={lang === 'tr' ? 'Telefon, e-posta ve web' : 'Phone, email and website'}
              onClick={() => setDetail('support')}
            />
            <div className={`mx-4 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
            <DrawerRow
              isDark={isDark}
              icon={<Award className="h-5 w-5" />}
              iconTone={isDark ? 'bg-primary/20 text-sky-300' : 'bg-primary/10 text-primary'}
              title={lang === 'tr' ? 'Rütbe sistemi' : lang === 'ar' ? 'نظام الرتب' : 'Rank system'}
              desc={lang === 'tr' ? 'Puan ve seviye' : 'Score and level'}
              onClick={() => {
                setRanksSegment('ranks');
                setDetail('ranks');
              }}
            />
            <div className={`mx-4 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
            <DrawerRow
              isDark={isDark}
              icon={<Gift className="h-5 w-5" />}
              iconTone={isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700'}
              title={lang === 'tr' ? 'Ödüller' : lang === 'ar' ? 'المكافآت' : 'Rewards'}
              desc={lang === 'tr' ? 'Puanlarını hediyeye çevir' : 'Redeem points for gifts'}
              onClick={() => {
                setRanksSegment('rewards');
                setDetail('ranks');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
