/** Belediye özet dashboard ile aynı yükleme iskeleti. */
export default function DashboardLoadingSkeleton({ statCount = 5 }: { statCount?: number }) {
  return (
    <div className="space-y-8 p-6">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${statCount >= 6 ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-5'}`}>
        {Array.from({ length: statCount }, (_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900" />
    </div>
  );
}
