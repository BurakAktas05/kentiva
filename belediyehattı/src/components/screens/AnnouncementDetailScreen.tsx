import { useEffect, useState } from 'react';
import { ChevronLeft, Clock, Share2, Calendar, CheckCircle2 } from 'lucide-react';
import { resolveMediaUrl, type ApiAnnouncement, type PublicTenant } from '../../api';
import { Lang, t } from '../../i18n';

interface AnnouncementDetailScreenProps {
  announcement: ApiAnnouncement;
  municipality?: PublicTenant | null;
  lang: Lang;
  isDark: boolean;
  onClose: () => void;
}

export default function AnnouncementDetailScreen({
  announcement,
  municipality,
  lang,
  isDark,
  onClose,
}: AnnouncementDetailScreenProps) {
  const dateStr = announcement.startsAt
    ? new Date(announcement.startsAt).toLocaleDateString(
        lang === 'tr' ? 'tr-TR' : lang === 'ar' ? 'ar' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      )
    : null;

  const [copiedFeedback, setCopiedFeedback] = useState(false);

  useEffect(() => {
    if (!copiedFeedback) return;
    const timeout = window.setTimeout(() => setCopiedFeedback(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [copiedFeedback]);

  const handleShare = async () => {
    const shareData = {
      title: announcement.title,
      text: announcement.content.substring(0, 100) + '...',
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${announcement.title}\n\n${announcement.content}`);
        setCopiedFeedback(true);
      }
    } catch (err) {
      console.warn('Share failed:', err);
    }
  };

  return (
    <div className={`min-h-full flex flex-col ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} relative`}>
      {copiedFeedback && (
        <div
          role="status"
          className={`fixed left-4 right-4 top-4 z-50 mx-auto max-w-sm rounded-2xl border px-4 py-3 text-center text-xs font-semibold shadow-lg ${
            isDark ? 'border-emerald-500/30 bg-emerald-950/90 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {lang === 'tr' ? 'Duyuru metni panoya kopyalandı!' : 'Announcement copied to clipboard!'}
        </div>
      )}

      {/* Banner / Cover Image Section */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-64 bg-slate-900 overflow-hidden shrink-0">
        {announcement.imageUrl ? (
          <img 
            src={resolveMediaUrl(announcement.imageUrl)} 
            alt={announcement.title}
            className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-primary via-indigo-900 to-secondary opacity-80" />
        )}
        {/* Soft dark overlay for text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

        {/* Floating Top Bar (Back & Share Buttons) */}
        <div className="absolute top-4 inset-x-4 flex justify-between items-center z-20">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/40 text-white backdrop-blur-md border border-white/10 hover:bg-slate-900/60 active:scale-95 transition-all shadow-lg"
            aria-label={t('announcement.detail.back', lang)}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <button
            type="button"
            onClick={handleShare}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/40 text-white backdrop-blur-md border border-white/10 hover:bg-slate-900/60 active:scale-95 transition-all shadow-lg"
            aria-label="Share"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        {/* Floating Category Badge over Cover Image */}
        <div className="absolute bottom-4 left-4 z-10">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-primary/95 text-white px-3 py-1 rounded-full backdrop-blur-sm shadow-md">
            <Calendar className="h-3 w-3" />
            {lang === 'tr' ? 'Resmi Duyuru' : 'Official News'}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 -mt-5 relative z-10 rounded-t-3xl shadow-2xl overflow-y-auto px-5 pt-6 pb-12 transition-all ${
        isDark ? 'bg-slate-950' : 'bg-slate-50'
      }`}>
        {/* White background block for content details */}
        <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${
          isDark ? 'border-slate-800/80 bg-slate-900' : 'border-slate-200/90 bg-white'
        }`}>
          {/* Announcement Title */}
          <h2 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-slate-800 dark:text-white">
            {announcement.title}
          </h2>

          {/* Published Time Info */}
          {dateStr && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              <Clock className="h-3.5 w-3.5" />
              <span>{t('announcement.detail.published', lang)}:</span>
              <span className="text-primary dark:text-sky-400 font-semibold">{dateStr}</span>
            </div>
          )}

          <div className="h-px bg-slate-100 dark:bg-slate-800/60 my-5" />

          {/* Announcement Body Content */}
          <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            {announcement.content}
          </p>
        </div>

        {/* Municipality Verification Seal / Footer Stamp Card */}
        <div className={`mt-5 rounded-2xl border p-4 flex gap-3.5 items-center ${
          isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200/60 bg-white/50'
        }`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 shrink-0">
            <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">
              {lang === 'tr' ? 'Belediye kaynağı' : 'Municipality source'}
            </span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-medium mt-0.5">
              {lang === 'tr'
                ? `Bu duyuru ${municipality?.displayName || 'belediyeniz'} resmi iletişim kanalları tarafından yayınlanmıştır.`
                : `This announcement is officially published by ${municipality?.displayName || 'your municipality'}.`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
