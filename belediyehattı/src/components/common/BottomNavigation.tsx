import { Home, Map, User, Users } from 'lucide-react';
import type { Lang } from '../../i18n';
import { t } from '../../i18n';
import type { Tab } from '../../hooks/useAppRouting';

interface BottomNavigationProps {
  activeTab: Tab;
  lang: Lang;
  isDark: boolean;
  onNavigate: (tab: Tab) => void;
}

const NAV_ITEMS = [
  { tab: 'home', labelKey: 'tab.home', icon: Home },
  { tab: 'kent', labelKey: 'tab.kent', icon: Map },
  { tab: 'topluluk', labelKey: 'tab.community', icon: Users },
  { tab: 'profile', labelKey: 'tab.profile', icon: User },
] as const;

export default function BottomNavigation({ activeTab, lang, isDark, onNavigate }: BottomNavigationProps) {
  return (
    <nav
      aria-label={lang === 'tr' ? 'Ana menü' : lang === 'ar' ? 'القائمة الرئيسية' : 'Main menu'}
      className={`absolute bottom-0 z-20 w-full rounded-t-3xl border-t px-2 pb-safe pt-2 shadow-[0_-12px_36px_-20px_rgba(15,23,42,0.28)] backdrop-blur-xl ${
        isDark ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200/90 bg-white/95'
      }`}
    >
      <div className="grid grid-cols-4 gap-1">
        {NAV_ITEMS.map(({ tab, labelKey, icon: Icon }) => {
          const isActive = activeTab === tab;
          const label = t(labelKey, lang);

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
