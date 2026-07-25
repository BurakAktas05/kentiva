import { Building2, ClipboardList, Home, Plus } from 'lucide-react';
import type { Lang } from '../../i18n';
import { t } from '../../i18n';
import type { Tab } from '../../hooks/useAppRouting';

interface BottomNavigationProps {
  activeTab: Tab;
  lang: Lang;
  isDark: boolean;
  onNavigate: (tab: Tab) => void;
}

/** Ana · Bildir (merkez) · İhbarlarım · Belediye */
const NAV_ITEMS = [
  { tab: 'home' as const, labelKey: 'tab.home', icon: Home, center: false },
  { tab: 'report' as const, labelKey: 'tab.report', icon: Plus, center: true },
  { tab: 'reports' as const, labelKey: 'tab.reports', icon: ClipboardList, center: false },
  { tab: 'kent' as const, labelKey: 'tab.belediye', icon: Building2, center: false },
];

export default function BottomNavigation({ activeTab, lang, isDark, onNavigate }: BottomNavigationProps) {
  const isKentActive = activeTab === 'kent';

  return (
    <nav
      aria-label={lang === 'tr' ? 'Ana menü' : lang === 'ar' ? 'القائمة الرئيسية' : 'Main menu'}
      className={`absolute bottom-0 z-20 w-full rounded-t-3xl border-t px-2 pb-safe pt-2 shadow-[0_-12px_36px_-20px_rgba(15,23,42,0.28)] backdrop-blur-xl ${
        isDark ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200/90 bg-white/95'
      }`}
    >
      <div className="grid grid-cols-4 gap-1">
        {NAV_ITEMS.map(({ tab, labelKey, icon: Icon, center }) => {
          const isActive = tab === 'kent' ? isKentActive : activeTab === tab;
          const label = t(labelKey, lang);

          if (center) {
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onNavigate(tab)}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] font-bold"
              >
                <span
                  className={`-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg shadow-primary/30 transition active:scale-[0.97] ${
                    isActive ? 'bg-primary-dark ring-2 ring-primary/40' : 'bg-primary'
                  }`}
                >
                  <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={2.5} />
                </span>
                <span className={`max-w-full truncate px-0.5 ${isActive ? 'text-primary' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onNavigate(tab)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] font-bold transition-all active:scale-[0.97] ${
                isActive
                  ? isDark
                    ? 'bg-primary/20 text-sky-200'
                    : 'bg-primary/10 text-primary'
                  : isDark
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="max-w-full truncate px-0.5">{label}</span>
              <span
                aria-hidden="true"
                className={`absolute bottom-0.5 h-1 w-1 rounded-full bg-current transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
