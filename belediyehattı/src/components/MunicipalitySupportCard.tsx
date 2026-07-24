import type { ReactNode } from 'react';
import { ExternalLink, Globe, Headphones, Mail, Phone, ShieldCheck } from 'lucide-react';
import type { PublicTenant } from '../api';
import { type Lang, t } from '../i18n';

interface MunicipalitySupportCardProps {
  municipality?: PublicTenant | null;
  lang: Lang;
  isDark: boolean;
}

export default function MunicipalitySupportCard({ municipality, lang, isDark }: MunicipalitySupportCardProps) {
  if (!municipality) return null;

  const hasContact = Boolean(
    municipality.contactPhone || municipality.contactEmail || municipality.websiteUrl,
  );
  const actionClass = `group flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all active:scale-[0.98] ${
    isDark
      ? 'border-slate-700/80 bg-slate-900/70 hover:border-slate-600 hover:bg-slate-800'
      : 'border-slate-200/80 bg-white/90 shadow-sm hover:border-primary/20 hover:bg-sky-50/40'
  }`;

  const actionContent = (icon: ReactNode, label: string, value: string) => (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isDark ? 'bg-slate-800' : 'bg-slate-50'
        }`}>
          {icon}
        </span>
        <span className="min-w-0">
          <span className={`block text-xs font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {label}
          </span>
          <span className={`mt-0.5 block max-w-[220px] truncate text-[10px] font-semibold ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {value}
          </span>
        </span>
      </span>
      <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </>
  );

  return (
    <section
      aria-labelledby="municipality-support-title"
      className={`relative overflow-hidden rounded-[26px] border shadow-sm ${
        isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200/80 bg-white'
      }`}
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-sky-600 px-4 py-4 text-white">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full border-[18px] border-white/10" />
        <div className="relative flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
            <Headphones aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-100">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
              {municipality.displayName}
            </span>
            <h3 id="municipality-support-title" className="mt-1 text-sm font-extrabold tracking-tight">
              {t('settings.contact.title', lang)}
            </h3>
            <p className="mt-1 text-[11px] font-medium leading-relaxed text-blue-100/90">
              {t('settings.contact.desc', lang)}
            </p>
          </span>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {municipality.contactPhone && (
          <a href={`tel:${municipality.contactPhone}`} className={actionClass}>
            {actionContent(
              <Phone aria-hidden="true" className="h-4 w-4 text-emerald-500" />,
              t('settings.contact.phone', lang),
              municipality.contactPhone,
            )}
          </a>
        )}
        {municipality.contactEmail && (
          <a href={`mailto:${municipality.contactEmail}`} className={actionClass}>
            {actionContent(
              <Mail aria-hidden="true" className="h-4 w-4 text-primary dark:text-sky-300" />,
              t('settings.contact.email', lang),
              municipality.contactEmail,
            )}
          </a>
        )}
        {municipality.websiteUrl && (
          <a
            href={municipality.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className={actionClass}
          >
            {actionContent(
              <Globe aria-hidden="true" className="h-4 w-4 text-sky-500" />,
              t('settings.contact.website', lang),
              municipality.websiteUrl,
            )}
          </a>
        )}
        {!hasContact && (
          <div className={`rounded-2xl border border-dashed p-4 text-center text-xs font-semibold ${
            isDark ? 'border-slate-700 bg-slate-900/70 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}>
            {t('settings.contact.none', lang)}
          </div>
        )}
      </div>
    </section>
  );
}
