import { motion } from 'framer-motion';

export default function MunicipalitySettingsSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      className="space-y-6 p-6"
    >
      <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <motion.div className="h-9 w-72 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      <motion.div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900" />
      </div>
    </motion.div>
  );
}
