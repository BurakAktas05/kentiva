/** Kentiva vatandaş uygulaması — ortak UI sınıfları */

export function screenBg(isDark: boolean): string {
  return isDark ? 'bg-slate-950' : 'bg-slate-50';
}

export function kentivaCard(isDark: boolean, extra = ''): string {
  return `rounded-2xl border p-4 shadow-sm ${
    isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200/90 bg-white'
  } ${extra}`.trim();
}

export function sectionTitleClass(): string {
  return 'text-sm font-semibold text-slate-700 dark:text-slate-200';
}

export function sectionHintClass(): string {
  return 'text-[10px] text-slate-500 dark:text-slate-400';
}

export function screenHeadingClass(isDark: boolean): string {
  return `text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`;
}

export function screenSubtitleClass(): string {
  return 'text-sm text-slate-500 dark:text-slate-400';
}

export function segmentBarClass(isDark: boolean): string {
  return `flex rounded-2xl p-1 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`;
}

export function segmentBtnClass(active: boolean, isDark: boolean): string {
  return `flex-1 rounded-xl py-2.5 text-xs font-semibold transition-colors ${
    active
      ? isDark
        ? 'bg-slate-700 text-white shadow-sm'
        : 'bg-white text-slate-900 shadow-sm'
      : 'text-slate-500 dark:text-slate-400'
  }`;
}

export function kentivaInputClass(isDark: boolean): string {
  return `w-full rounded-xl border px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary ${
    isDark
      ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500'
      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
  }`;
}

export function primaryBtnClass(disabled = false): string {
  return `flex w-full min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition active:scale-[0.99] disabled:opacity-50 ${
    disabled ? 'cursor-not-allowed' : 'hover:brightness-105'
  }`;
}

/** Kapak / kart görselleri — tüm ekranlarda aynı oran */
export const coverMediaClass =
  'relative w-full overflow-hidden rounded-2xl aspect-[16/9] max-h-52 bg-slate-200 dark:bg-slate-800';

export const coverMediaImgClass = 'absolute inset-0 h-full w-full object-cover object-center';

/** Yatay duyuru kartı (ana sayfa şeridi) */
export const announcementCardClass =
  'relative shrink-0 snap-center w-[78%] max-w-[320px] aspect-[16/9] rounded-2xl overflow-hidden text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-primary';

export function detailHeaderBar(isDark: boolean): string {
  return `sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b px-4 py-3 pt-safe backdrop-blur-md ${
    isDark ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200 bg-white/95'
  }`;
}

export function detailBackBtnClass(isDark: boolean): string {
  return `-ml-1 rounded-xl p-2 transition-colors ${
    isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
  }`;
}

export function detailTitleClass(isDark: boolean): string {
  return `min-w-0 flex-1 truncate text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`;
}

export function mediaThumbClass(isDark: boolean): string {
  return `h-24 w-24 shrink-0 rounded-xl border object-cover object-center ${
    isDark ? 'border-slate-700' : 'border-slate-200'
  }`;
}

export function reportStatusBadgeClass(status: string): string {
  switch (status) {
    case 'RESOLVED':
      return 'rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'PROCESSING':
      return 'rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-900/35 dark:text-sky-200';
    case 'REJECTED':
      return 'rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  }
}
