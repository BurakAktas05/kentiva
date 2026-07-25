import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion';
import type { Lang } from '../../i18n';

interface SplashScreenProps {
  lang: Lang;
  /** Closing fade when boot is ready */
  exiting?: boolean;
}

/** Bright cold-start splash aligned with the citizen application's light surfaces. */
export default function SplashScreen({ lang, exiting = false }: SplashScreenProps) {
  const reduced = usePrefersReducedMotion();

  const tagline =
    lang === 'tr'
      ? 'Şehrini bildir, sürecini takip et'
      : lang === 'ar'
        ? 'أبلغ عن مدينتك وتابع العملية'
        : 'Report your city, track the process';

  const loading =
    lang === 'tr' ? 'Hazırlanıyor' : lang === 'ar' ? 'جارٍ التحضير' : 'Preparing';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      className={`fixed inset-0 z-[100] flex min-h-app flex-col overflow-hidden transition-opacity duration-500 ${
        exiting ? 'pointer-events-none opacity-0' : 'bg-slate-50 opacity-100'
      }`}
    >
      {/* Quiet depth without turning the launch experience into a brand-color wall. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-80 w-80 rounded-full bg-amber-100/55 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(148,163,184,.2) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 pt-safe pb-safe">
        <div
          className={`flex flex-col items-center text-center ${
            reduced ? '' : 'animate-[splash-rise_0.9s_ease-out_both]'
          }`}
        >
          <div className="relative mb-7">
            {!reduced ? (
              <div
                className="absolute inset-0 scale-110 rounded-[28%] bg-primary/10 blur-2xl animate-pulse"
                aria-hidden
              />
            ) : null}
            <img
              src="/kentiva-app-icon.png"
              alt=""
              width={128}
              height={128}
              className="relative h-32 w-32 rounded-[28%] border border-slate-200/80 object-cover shadow-kentiva-sm"
              aria-hidden
            />
          </div>

          <h1 className="font-sans text-[2.35rem] font-extrabold tracking-[-0.04em] text-slate-900 sm:text-5xl">
            Kentiva
          </h1>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            {lang === 'tr'
              ? 'Belediye operasyon platformu'
              : lang === 'ar'
                ? 'منصة تشغيل البلدية'
                : 'Municipal operations platform'}
          </p>
          <p className="mt-5 max-w-[17rem] text-sm font-medium leading-relaxed text-slate-600">
            {tagline}
          </p>
        </div>

        <div
          className={`absolute bottom-10 left-0 right-0 flex flex-col items-center gap-3 px-6 pb-safe ${
            reduced ? '' : 'animate-[splash-rise_0.9s_ease-out_0.25s_both]'
          }`}
        >
          <div className="h-1 w-28 overflow-hidden rounded-full bg-slate-200" aria-hidden>
            <div
              className={`h-full rounded-full bg-primary ${
                reduced ? 'w-full' : 'w-1/2 animate-[splash-bar_1.4s_ease-in-out_infinite]'
              }`}
            />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {loading}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes splash-rise {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes splash-bar {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
      `}</style>
    </div>
  );
}
