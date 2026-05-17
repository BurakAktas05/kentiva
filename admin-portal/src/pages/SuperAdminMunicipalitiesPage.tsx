import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Palette } from 'lucide-react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import api from '../api';
type MunicipalityRow = {
  id: string;
  name: string;
  slug: string;
  displayName: string | null;
  active: boolean | null;
  onboarded: boolean | null;
  publicStatsEnabled: boolean | null;
  subscriptionPlan?: string;
  subscriptionEndsAt?: string | null;
  daysRemaining?: number | null;
  membershipStatus?: string;
};

export default function SuperAdminMunicipalitiesPage() {
  const [rows, setRows] = useState<MunicipalityRow[]>([]);
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
      .then((res) => setRows(res.data.data as MunicipalityRow[]))
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
    <div className="space-y-8 p-6">
      <div>
        <Link to="/" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft size={14} /> Platform dashboard
        </Link>
        <p className="kentiva-eyebrow">Süper admin</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Belediyeler</h2>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">Onboarding ve çok kiracılı yönetim.</p>
        <Link
          to="/admin/onboarding"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
        >
          <Sparkles size={16} />
          Kurulum sihirbazını aç
        </Link>
      </div>

      <form onSubmit={create} className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-6 text-slate-500">Yükleniyor…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-left">
              <tr>
                <th className="p-3">Ad</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Üyelik</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Kalan gün</th>
                <th className="p-3">Bitiş</th>
                <th className="p-3">Aktif</th>
                <th className="p-3">Onboarding</th>
                <th className="p-3">Marka</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3 font-medium">{r.displayName || r.name}</td>
                  <td className="p-3 text-slate-500">{r.slug}</td>
                  <td className="p-3 text-xs font-semibold uppercase">{r.membershipStatus ?? '—'}</td>
                  <td className="p-3">{r.subscriptionPlan ?? '—'}</td>
                  <td className="p-3 tabular-nums">{r.daysRemaining ?? '—'}</td>
                  <td className="p-3 text-slate-500">
                    {r.subscriptionEndsAt ? new Date(r.subscriptionEndsAt).toLocaleDateString('tr-TR') : '—'}
                  </td>
                  <td className="p-3">{r.active ? 'Evet' : 'Hayır'}</td>
                  <td className="p-3">{r.onboarded ? 'Evet' : 'Hayır'}</td>
                  <td className="p-3">
                    <Link
                      to={`/admin/municipalities/${r.id}/branding`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Palette size={14} />
                      Özelleştir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
