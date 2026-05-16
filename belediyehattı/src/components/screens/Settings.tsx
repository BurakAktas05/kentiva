import { motion } from 'motion/react';
import { ChevronLeft, Globe, Moon, Sun, Monitor, Info, Check, Building2 } from 'lucide-react';
import { Lang, LANGUAGES, t } from '../../i18n';

interface SettingsProps {
  lang: Lang;
  theme: 'light' | 'dark' | 'system';
  onLangChange: (lang: Lang) => void;
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onBack: () => void;
  onChangeMunicipality?: () => void;
}

export default function Settings({ lang, theme, onLangChange, onThemeChange, onBack, onChangeMunicipality }: SettingsProps) {
  const themeOptions = [
    { value: 'light' as const, icon: <Sun className="w-5 h-5" />, label: t('settings.theme.light', lang) },
    { value: 'dark' as const, icon: <Moon className="w-5 h-5" />, label: t('settings.theme.dark', lang) },
    { value: 'system' as const, icon: <Monitor className="w-5 h-5" />, label: t('settings.theme.system', lang) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="pb-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 dark:text-slate-400">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="font-bold text-lg text-slate-800 dark:text-white">{t('settings.title', lang)}</h2>
      </div>

      <div className="p-5 space-y-6">
        {onChangeMunicipality ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">{t('settings.municipality', lang)}</h3>
            </div>
            <button
              type="button"
              onClick={onChangeMunicipality}
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left text-sm font-medium text-slate-800 dark:text-slate-100 hover:border-primary/40"
            >
              {t('settings.changeMunicipality', lang)}
            </button>
          </div>
        ) : null}

        {/* Language */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">{t('settings.language', lang)}</h3>
          </div>
          <div className="space-y-2">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => onLangChange(l.code)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  lang === l.code
                    ? 'border-primary bg-primary/10 dark:border-secondary dark:bg-primary/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{l.code === 'tr' ? '🇹🇷' : l.code === 'en' ? '🇬🇧' : '🇸🇦'}</span>
                  <div className="text-left">
                    <span className={`text-sm font-semibold ${lang === l.code ? 'text-primary dark:text-secondary' : 'text-slate-700 dark:text-slate-200'}`}>
                      {l.nativeName}
                    </span>
                    {l.code !== lang && (
                      <span className="text-xs text-slate-400 block">{l.name}</span>
                    )}
                  </div>
                </div>
                {lang === l.code && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">{t('settings.theme', lang)}</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => onThemeChange(opt.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  theme === opt.value
                    ? 'border-primary bg-primary/10 dark:border-secondary dark:bg-primary/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                }`}
              >
                <span className={theme === opt.value ? 'text-primary dark:text-secondary' : 'text-slate-500 dark:text-slate-400'}>{opt.icon}</span>
                <span className={`text-xs font-semibold ${theme === opt.value ? 'text-primary dark:text-secondary' : 'text-slate-600 dark:text-slate-300'}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* About */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">{t('settings.about', lang)}</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.version', lang)}</span>
              <span className="text-sm text-slate-400">1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
