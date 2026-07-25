export default function LoadingState({
  label = 'Yükleniyor…',
}: {
  label?: string;
}) {
  return (
    <div className="flex min-h-[12rem] items-center justify-center p-6" role="status" aria-live="polite">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
