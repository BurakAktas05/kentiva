import MunicipalityWidgetsPanel from '../components/MunicipalityWidgetsPanel';

export default function EventsAndOutagesPage() {
  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <p className="kentiva-eyebrow">Halkla İlişkiler</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Etkinlikler & Kesintiler
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
          Vatandaş uygulaması ana ekranında yayınlanacak planlı kesintileri ve belediye etkinliklerini yönetin.
        </p>
      </div>

      <MunicipalityWidgetsPanel />
    </div>
  );
}
