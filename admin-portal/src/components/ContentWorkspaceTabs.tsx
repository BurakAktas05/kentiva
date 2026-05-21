import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Megaphone } from 'lucide-react';

const tabs = [
  { to: '/announcements', label: 'Duyurular', icon: Megaphone },
  { to: '/surveys', label: 'Anketler', icon: BarChart3 },
];

export default function ContentWorkspaceTabs() {
  const location = useLocation();

  return (
    <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {tabs.map((tab) => {
        const active = location.pathname === tab.to;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              active
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
