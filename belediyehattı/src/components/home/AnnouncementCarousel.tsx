import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { resolveMediaUrl, type ApiAnnouncement } from '../../api';
import { Lang, t } from '../../i18n';
import { announcementCardClass, coverMediaImgClass } from '../../lib/ui';

const AUTO_INTERVAL_MS = 5000;
const PAUSE_AFTER_INTERACTION_MS = 9000;
const NEW_ANNOUNCEMENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type Props = {
  announcements: ApiAnnouncement[];
  lang: Lang;
  isDark: boolean;
  onOpen: (ann: ApiAnnouncement) => void;
};

export default function AnnouncementCarousel({ announcements, lang, isDark, onOpen }: Props) {
  const count = announcements.length;
  const loopSlides = useMemo(
    () => (count > 1 ? [...announcements, ...announcements, ...announcements] : announcements),
    [announcements, count],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isAdjustingRef = useRef(false);
  const pauseAutoUntilRef = useRef(0);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToLogical = useCallback(
    (logicalIndex: number, behavior: ScrollBehavior = 'smooth') => {
      const el = scrollRef.current;
      if (!el || count === 0) return;
      const physical = count > 1 ? logicalIndex + count : logicalIndex;
      const child = el.children[physical] as HTMLElement | undefined;
      if (!child) return;
      const left = child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2;
      el.scrollTo({ left: Math.max(0, left), behavior });
    },
    [count],
  );

  const pauseAuto = useCallback(() => {
    pauseAutoUntilRef.current = Date.now() + PAUSE_AFTER_INTERACTION_MS;
  }, []);

  const normalizeInfiniteScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || count <= 1 || isAdjustingRef.current) return;

    const viewportCenter = el.scrollLeft + el.clientWidth / 2;
    let closestPhysical = 0;
    let minDist = Infinity;

    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement;
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(viewportCenter - childCenter);
      if (dist < minDist) {
        minDist = dist;
        closestPhysical = i;
      }
    }

    let logical = closestPhysical;
    if (count > 1) {
      if (closestPhysical < count) logical = closestPhysical;
      else if (closestPhysical >= 2 * count) logical = closestPhysical - 2 * count;
      else logical = closestPhysical - count;

      const needsJump = closestPhysical < count || closestPhysical >= 2 * count;
      if (needsJump) {
        isAdjustingRef.current = true;
        const targetPhysical = logical + count;
        const target = el.children[targetPhysical] as HTMLElement;
        const left = target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2;
        el.scrollTo({ left: Math.max(0, left), behavior: 'instant' });
        requestAnimationFrame(() => {
          isAdjustingRef.current = false;
        });
      }
    }

    setActiveIndex(logical);
  }, [count]);

  useEffect(() => {
    if (count <= 1) {
      setActiveIndex(0);
      return;
    }
    const run = () => scrollToLogical(0, 'instant');
    requestAnimationFrame(run);
    const t = setTimeout(run, 80);
    return () => clearTimeout(t);
  }, [count, announcements, scrollToLogical]);

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(() => {
      if (Date.now() < pauseAutoUntilRef.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % count;
        scrollToLogical(next, 'smooth');
        return next;
      });
    }, AUTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [count, scrollToLogical]);

  const handleScroll = () => {
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = setTimeout(() => {
      normalizeInfiniteScroll();
    }, 120);
  };

  useEffect(
    () => () => {
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    },
    [],
  );

  if (count === 0) return null;

  const locale = lang === 'tr' ? 'tr-TR' : lang === 'ar' ? 'ar' : 'en-US';

  const getDateLabel = (startsAt: string) => {
    const publishedAt = new Date(startsAt);
    const ageMs = Date.now() - publishedAt.getTime();
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= NEW_ANNOUNCEMENT_WINDOW_MS) {
      return t('home.announcements.new', lang);
    }
    if (Number.isNaN(publishedAt.getTime())) {
      return lang === 'tr' ? 'Belediye duyurusu' : 'Municipality notice';
    }
    return publishedAt.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={pauseAuto}
        onMouseDown={pauseAuto}
        className="flex gap-3 w-full overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none snap-center"
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {loopSlides.map((ann, i) => (
          <button
            key={`${ann.id}-${i}`}
            type="button"
            onClick={() => onOpen(ann)}
            className={`${announcementCardClass} snap-center`}
            aria-label={ann.title}
          >
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
            {ann.imageUrl ? (
              <img src={resolveMediaUrl(ann.imageUrl)} alt={ann.title} className={coverMediaImgClass} />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-600 to-primary/60" />
            )}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-3 space-y-1 pointer-events-none">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-white">
                <Clock className="h-2.5 w-2.5" />
                {getDateLabel(ann.startsAt)}
              </span>
              <h4 className="text-sm font-semibold text-white line-clamp-2 leading-snug">{ann.title}</h4>
            </div>
          </button>
        ))}
      </div>

      {count > 1 && (
        <p
          className={`mt-3 text-center text-xs font-medium tabular-nums px-4 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {t('home.announcements.counter', lang, { current: activeIndex + 1, total: count })}
        </p>
      )}
    </div>
  );
}
