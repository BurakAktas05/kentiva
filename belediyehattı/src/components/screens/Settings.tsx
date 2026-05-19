import { motion } from 'motion/react';
import { ChevronLeft, Globe, Moon, Sun, Monitor, Info, Check } from 'lucide-react';
import { Lang, LANGUAGES, t } from '../../i18n';
import type { PublicTenant } from '../../api';
import MunicipalityCard from '../MunicipalityCard';

interface SettingsProps {
  lang: Lang;
  isDark: boolean;
  theme: 'light' | 'dark' | 'system';
  municipality?: PublicTenant | null;
  onLangChange: (lang: Lang) => void;
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onBack: () => void;
  onChangeMunicipality?: () => void;
}

export default function Settings({
  lang,
  isDark,
  theme,
  municipality,
  onLangChange,
  onThemeChange,
  onBack,
  onChangeMunicipality,
}: SettingsProps) {
  const themeOptions = [
    { value: 'light' as const, icon: <Sun className="w-5 h-5" />, label: t('settings.theme.light', lang) },
    { value: 'dark' as const, icon: <Moon className="w-5 h-5" />, label: t('settings.theme.dark', lang) },
    { value: 'system' as const, icon: <Monitor className="w-5 h-5" />, label: t('settings.theme.system', lang) },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-6">
      <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
        <button type="button" onClick={onBack} className="-ml-2 p-2 text-slate-500 dark:text-slate-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t('settings.title', lang)}</h2>
      </div>

      <div className="space-y-6 p-5">
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
            {t('settings.municipality', lang)}
          </h3>
          <MunicipalityCard tenant={municipality} lang={lang} isDark={isDark} onChange={onChangeMunicipality} />
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('settings.language', lang)}</h3>
          </div>
          <div className="space-y-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => onLangChange(l.code)}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 transition-all ${
                  lang === l.code
                    ? 'border-primary bg-primary/10 dark:border-secondary dark:bg-primary/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{l.code === 'tr' ? '🇹🇷' : l.code === 'en' ? '🇬🇧' : '🇸🇦'}</span>
                  <div className="text-left">
                    <span
                      className={`text-sm font-semibold ${
                        lang === l.code ? 'text-primary dark:text-secondary' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {l.nativeName}
                    </span>
                    {l.code !== lang && <span className="block text-xs text-slate-400">{l.name}</span>}
                  </div>
                </div>
                {lang === l.code && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Moon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('settings.theme', lang)}</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onThemeChange(opt.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  theme === opt.value
                    ? 'border-primary bg-primary/10 dark:border-secondary dark:bg-primary/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                <span className={theme === opt.value ? 'text-primary dark:text-secondary' : 'text-slate-500 dark:text-slate-400'}>
                  {opt.icon}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    theme === opt.value ? 'text-primary dark:text-secondary' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('settings.about', lang)}</h3>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-800">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.version', lang)}</span>
            <span className="text-sm text-slate-400">3.0.0</span>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
