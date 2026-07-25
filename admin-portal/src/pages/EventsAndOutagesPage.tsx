import MunicipalityWidgetsPanel from '../components/MunicipalityWidgetsPanel';

export default function EventsAndOutagesPage() {
  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <p className="kentiva-eyebrow">İletişim</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Kesintiler & Etkinlikler
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
          Vatandaş uygulamasında yayınlanacak planlı kesintileri ve belediye etkinliklerini yönetin.
        </p>
      </div>

      <MunicipalityWidgetsPanel />
    </div>
  );
}
