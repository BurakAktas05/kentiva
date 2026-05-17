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
