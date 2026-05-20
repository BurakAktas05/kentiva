import { ChevronLeft, Clock } from 'lucide-react';
import { resolveMediaUrl, type ApiAnnouncement } from '../../api';
import { Lang, t } from '../../i18n';
import {
  coverMediaClass,
  coverMediaImgClass,
  detailBackBtnClass,
  detailHeaderBar,
  detailTitleClass,
  kentivaCard,
  screenBg,
} from '../../lib/ui';

interface AnnouncementDetailScreenProps {
  announcement: ApiAnnouncement;
  lang: Lang;
  isDark: boolean;
  onClose: () => void;
}

export default function AnnouncementDetailScreen({
  announcement,
  lang,
  isDark,
  onClose,
}: AnnouncementDetailScreenProps) {
  const dateStr = announcement.startsAt
    ? new Date(announcement.startsAt).toLocaleDateString(
        lang === 'tr' ? 'tr-TR' : lang === 'ar' ? 'ar' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
      )
    : null;

  return (
    <div className={`min-h-full flex flex-col ${screenBg(isDark)}`}>
      <header className={detailHeaderBar(isDark)}>
        <button
          type="button"
          onClick={onClose}
          className={detailBackBtnClass(isDark)}
          aria-label={t('announcement.detail.back', lang)}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className={detailTitleClass(isDark)}>{t('announcement.detail.title', lang)}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4">
        {announcement.imageUrl ? (
          <div className={coverMediaClass}>
            <img src={resolveMediaUrl(announcement.imageUrl)} alt="" className={coverMediaImgClass} />
          </div>
        ) : (
          <div className={`${coverMediaClass} bg-gradient-to-br from-slate-600 to-primary/50`} />
        )}

        <div className={kentivaCard(isDark)}>
          <h2 className={`text-lg font-semibold leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {announcement.title}
          </h2>

          {dateStr && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {t('announcement.detail.published', lang)}: {dateStr}
            </p>
          )}

          <p className={`mt-4 text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {announcement.content}
          </p>
        </div>
      </div>
    </div>
  );
}
