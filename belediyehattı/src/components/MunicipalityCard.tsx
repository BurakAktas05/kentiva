import { Building2, ChevronRight } from 'lucide-react';
import { resolveMediaUrl, type PublicTenant } from '../api';
import { Lang, t } from '../i18n';

type Props = {
  tenant: PublicTenant | null | undefined;
  lang: Lang;
  isDark: boolean;
  onChange?: () => void;
  compact?: boolean;
};

export default function MunicipalityCard({ tenant, lang, isDark, onChange, compact }: Props) {
  const shell = isDark
    ? 'border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900'
    : 'border-slate-200 bg-gradient-to-br from-white to-slate-50';

  if (!tenant?.id) {
    return (
      <div className={`rounded-2xl border p-4 ${shell}`}>
        <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          {t('settings.municipalityNone', lang)}
        </p>
        {onChange ? (
          <button
            type="button"
            onClick={onChange}
            className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
          >
            {t('home.selectMunicipality', lang)}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${shell}`}>
      <div className="flex items-start gap-3">
        <div
          className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-primary"
          aria-hidden
        >
          <Building2 className="h-7 w-7" />
          {tenant.logoUrl ? (
            <img
              src={resolveMediaUrl(tenant.logoUrl)}
              alt=""
              className="absolute inset-0 h-full w-full border border-white/20 bg-white object-contain p-1"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            {t('settings.municipalityLinked', lang)}
          </span>
          <p className={`mt-1 truncate text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {tenant.displayName}
          </p>
          {!compact && tenant.slogan ? (
            <p className={`mt-0.5 line-clamp-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {tenant.slogan}
            </p>
          ) : null}
        </div>
      </div>
      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors active:scale-[0.99] ${
            isDark
              ? 'border-slate-600 bg-slate-800/80 text-slate-200 hover:bg-slate-800'
              : 'border-slate-200 bg-white text-slate-800 hover:border-primary/30'
          }`}
        >
          {t('settings.changeMunicipality', lang)}
          <ChevronRight className="h-4 w-4 opacity-60" />
        </button>
      ) : null}
    </div>
  );
}
