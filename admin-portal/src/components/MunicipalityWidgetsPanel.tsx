import { useCallback, useEffect, useState } from 'react';
import { Calendar, Droplets, Plus, Trash2, Zap } from 'lucide-react';
import api from '../api';

type Outage = {
  id: string;
  outageType: string;
  title: string;
  district: string | null;
  message: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

type Event = {
  id: string;
  title: string;
  venue: string | null;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  externalUrl: string | null;
};

const inputClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';

export default function MunicipalityWidgetsPanel() {
  const [outages, setOutages] = useState<Outage[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [outageForm, setOutageForm] = useState({
    outageType: 'WATER',
    title: '',
    district: '',
    message: '',
    startsAt: '',
    endsAt: '',
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    venue: '',
    description: '',
    startsAt: '',
    endsAt: '',
    externalUrl: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, eRes] = await Promise.all([
        api.get('/municipalities/me/widgets/outages'),
        api.get('/municipalities/me/widgets/events'),
      ]);
      setOutages(oRes.data.data ?? []);
      setEvents(eRes.data.data ?? []);
    } catch {
      setMsg('Widget verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addOutage = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/municipalities/me/widgets/outages', {
        outageType: outageForm.outageType,
        title: outageForm.title,
        district: outageForm.district || null,
        message: outageForm.message || null,
        startsAt: outageForm.startsAt || null,
        endsAt: outageForm.endsAt || null,
        active: true,
      });
      setOutageForm({ outageType: 'WATER', title: '', district: '', message: '', startsAt: '', endsAt: '' });
      setMsg('Kesinti yayınlandı.');
      await load();
    } catch {
      setMsg('Kesinti eklenemedi.');
    }
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.startsAt) {
      setMsg('Etkinlik başlangıç tarihi zorunlu.');
      return;
    }
    setMsg('');
    try {
      await api.post('/municipalities/me/widgets/events', {
        title: eventForm.title,
        venue: eventForm.venue || null,
        description: eventForm.description || null,
        startsAt: eventForm.startsAt,
        endsAt: eventForm.endsAt || null,
        externalUrl: eventForm.externalUrl || null,
        active: true,
      });
      setEventForm({ title: '', venue: '', description: '', startsAt: '', endsAt: '', externalUrl: '' });
      setMsg('Etkinlik yayınlandı.');
      await load();
    } catch {
      setMsg('Etkinlik eklenemedi.');
    }
  };

  const removeOutage = async (id: string) => {
    await api.delete(`/municipalities/me/widgets/outages/${id}`);
    await load();
  };

  const removeEvent = async (id: string) => {
    await api.delete(`/municipalities/me/widgets/events/${id}`);
    await load();
  };

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        Vatandaş ana ekran
      </p>
      <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Kesinti ve kent etkinlikleri</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Yalnızca buradan eklediğiniz resmi duyurular vatandaş uygulamasında görünür. Sahte veya örnek veri kullanılmaz.
      </p>

      {msg ? <p className="mt-3 text-sm text-primary">{msg}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-500">Yükleniyor…</p> : null}

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <Droplets className="h-4 w-4 text-amber-600" />
            Planlı kesintiler
          </h4>
          <form onSubmit={addOutage} className="mt-3 space-y-2">
            <select
              className={inputClass}
              value={outageForm.outageType}
              onChange={(e) => setOutageForm((f) => ({ ...f, outageType: e.target.value }))}
            >
              <option value="WATER">Su</option>
              <option value="ELECTRIC">Elektrik</option>
            </select>
            <input
              className={inputClass}
              placeholder="Başlık (ör. Mahalle X su kesintisi)"
              required
              value={outageForm.title}
              onChange={(e) => setOutageForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="Mahalle / ilçe"
              value={outageForm.district}
              onChange={(e) => setOutageForm((f) => ({ ...f, district: e.target.value }))}
            />
            <textarea
              className={inputClass}
              placeholder="Vatandaşa açıklama"
              rows={2}
              value={outageForm.message}
              onChange={(e) => setOutageForm((f) => ({ ...f, message: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                className={inputClass}
                value={outageForm.startsAt}
                onChange={(e) => setOutageForm((f) => ({ ...f, startsAt: e.target.value }))}
              />
              <input
                type="datetime-local"
                className={inputClass}
                value={outageForm.endsAt}
                onChange={(e) => setOutageForm((f) => ({ ...f, endsAt: e.target.value }))}
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Kesinti yayınla
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {outages.map((o) => (
              <li
                key={o.id}
                className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
              >
                <div>
                  {o.outageType === 'WATER' ? (
                    <Droplets className="mb-1 h-4 w-4 text-amber-600" />
                  ) : (
                    <Zap className="mb-1 h-4 w-4 text-amber-600" />
                  )}
                  <p className="font-semibold">{o.title}</p>
                  {o.district && <p className="text-xs text-slate-500">{o.district}</p>}
                </div>
                <button type="button" onClick={() => removeOutage(o.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <Calendar className="h-4 w-4 text-violet-600" />
            Kent etkinlikleri
          </h4>
          <form onSubmit={addEvent} className="mt-3 space-y-2">
            <input
              className={inputClass}
              placeholder="Etkinlik adı"
              required
              value={eventForm.title}
              onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="Mekân"
              value={eventForm.venue}
              onChange={(e) => setEventForm((f) => ({ ...f, venue: e.target.value }))}
            />
            <textarea
              className={inputClass}
              placeholder="Açıklama"
              rows={2}
              value={eventForm.description}
              onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
            />
            <input
              type="datetime-local"
              className={inputClass}
              required
              value={eventForm.startsAt}
              onChange={(e) => setEventForm((f) => ({ ...f, startsAt: e.target.value }))}
            />
            <input
              type="datetime-local"
              className={inputClass}
              value={eventForm.endsAt}
              onChange={(e) => setEventForm((f) => ({ ...f, endsAt: e.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="Dış bağlantı (https)"
              value={eventForm.externalUrl}
              onChange={(e) => setEventForm((f) => ({ ...f, externalUrl: e.target.value }))}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Etkinlik yayınla
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
              >
                <div>
                  <p className="font-semibold">{ev.title}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(ev.startsAt).toLocaleString('tr-TR')}
                    {ev.venue ? ` · ${ev.venue}` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => removeEvent(ev.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
