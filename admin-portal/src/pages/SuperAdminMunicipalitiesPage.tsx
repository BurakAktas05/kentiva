import { useCallback, useEffect, useState } from 'react';
import api from '../api';

type MunicipalityDto = {
  id: string;
  name: string;
  slug: string;
  displayName: string | null;
  active: boolean | null;
  onboarded: boolean | null;
  publicStatsEnabled: boolean | null;
};

export default function SuperAdminMunicipalitiesPage() {
  const [rows, setRows] = useState<MunicipalityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [centerLatStr, setCenterLatStr] = useState('');
  const [centerLngStr, setCenterLngStr] = useState('');
  const [defaultZoomStr, setDefaultZoomStr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/admin/municipalities')
      .then((res) => setRows(res.data.data as MunicipalityDto[]))
      .catch(() => setMsg('Liste yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    const parseOpt = (s: string): number | null => {
      const t = s.trim();
      if (!t) return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };
    const centerLat = parseOpt(centerLatStr);
    const centerLng = parseOpt(centerLngStr);
    const defaultZoom = parseOpt(defaultZoomStr);
    try {
      await api.post('/admin/municipalities', {
        name,
        type: 'DISTRICT',
        parentMunicipalityId: parentId || null,
        slug: slug || null,
        displayName: null,
        centerLat,
        centerLng,
        defaultZoom: defaultZoom != null ? Math.round(defaultZoom) : null,
      });
      setName('');
      setSlug('');
      setParentId('');
      setCenterLatStr('');
      setCenterLngStr('');
      setDefaultZoomStr('');
      load();
      setMsg('Belediye oluşturuldu.');
    } catch (err: unknown) {
      const m = err as { response?: { data?: { message?: string } } };
      setMsg(m.response?.data?.message || 'Oluşturma başarısız.');
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Süper admin</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Belediyeler</h2>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">Onboarding ve çok kiracılı yönetim.</p>
      </div>

      <form onSubmit={create} className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-semibold text-slate-800 dark:text-white">Yeni ilçe belediyesi</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            required
            placeholder="Resmi ad"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Slug (opsiyonel)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <input
            placeholder="Üst belediye ID (büyükşehir, opsiyonel)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 sm:col-span-2"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Merkez enlem (örn. 41.25 — vatandaş GPS için)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={centerLatStr}
            onChange={(e) => setCenterLatStr(e.target.value)}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Merkez boylam (örn. 32.68)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={centerLngStr}
            onChange={(e) => setCenterLngStr(e.target.value)}
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="Varsayılan zoom (örn. 13, opsiyonel)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 sm:col-span-2"
            value={defaultZoomStr}
            onChange={(e) => setDefaultZoomStr(e.target.value)}
          />
        </div>
        <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
          Oluştur
        </button>
      </form>

      {msg ? <p className="text-sm text-slate-600 dark:text-slate-400">{msg}</p> : null}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
        {loading ? (
          <div className="p-6 text-slate-500">Yükleniyor…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-left">
              <tr>
                <th className="p-3">Ad</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Aktif</th>
                <th className="p-3">Onboarding</th>
                <th className="p-3">Public stats</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3 font-medium">{r.displayName || r.name}</td>
                  <td className="p-3 text-slate-500">{r.slug}</td>
                  <td className="p-3">{r.active ? 'Evet' : 'Hayır'}</td>
                  <td className="p-3">{r.onboarded ? 'Evet' : 'Hayır'}</td>
                  <td className="p-3">{r.publicStatsEnabled ? 'Evet' : 'Hayır'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
