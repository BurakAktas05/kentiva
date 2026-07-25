import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import ConfirmDialog from './ui/ConfirmDialog';
import Toast, { type ToastState } from './ui/Toast';

type ReportTemplate = {
  id: string;
  templateKey: string;
  title: string;
  descriptionTemplate: string;
  categoryId: string;
  categoryName: string;
  iconCode: string | null;
  sortOrder: number;
  global: boolean;
};

type Category = { id: string; name: string };
const inputClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900';

export default function ReportTemplatesPanel() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [removeTarget, setRemoveTarget] = useState<ReportTemplate | null>(null);
  const [removing, setRemoving] = useState(false);
  const [form, setForm] = useState({
    templateKey: '',
    title: '',
    descriptionTemplate: '',
    categoryId: '',
    iconCode: '',
    sortOrder: '0',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, catRes] = await Promise.all([
        api.get('/report-templates'),
        api.get('/categories'),
      ]);
      setTemplates((tplRes.data.data as ReportTemplate[]) || []);
      const cats = (catRes.data.data as { id: string; name: string }[]) || [];
      setCategories(cats);
      setForm((f) => (f.categoryId ? f : { ...f, categoryId: cats[0]?.id || '' }));
    } catch {
      setToast({ type: 'error', message: 'Şablonlar yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/report-templates', {
        templateKey: form.templateKey.trim(),
        title: form.title.trim(),
        descriptionTemplate: form.descriptionTemplate.trim(),
        categoryId: form.categoryId,
        iconCode: form.iconCode.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
        global: false,
      });
      setForm({
        templateKey: '',
        title: '',
        descriptionTemplate: '',
        categoryId: categories[0]?.id || '',
        iconCode: '',
        sortOrder: '0',
      });
      setToast({ type: 'success', message: 'Şablon eklendi.' });
      await load();
    } catch (err: unknown) {
      const m = err as { response?: { data?: { message?: string } } };
      setToast({ type: 'error', message: m.response?.data?.message || 'Kayıt başarısız.' });
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api.delete(`/report-templates/${removeTarget.id}`);
      setToast({ type: 'success', message: 'Şablon devre dışı bırakıldı.' });
      setRemoveTarget(null);
      await load();
    } catch {
      setToast({ type: 'error', message: 'Silme başarısız.' });
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Şablonlar yükleniyor…</p>;
  }

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        Bildirim şablonları
      </p>
      <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">İhbar Hızlı Seçim Şablonları</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Vatandaş uygulamasında hızlı seçim kartları. Aynı anahtarla global şablonu belediye özelinde geçersiz kılarsınız.
      </p>

      {templates.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/30 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/40"
            >
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{t.title}</span>
                <span className="ml-2 text-[10px] uppercase text-slate-400 font-bold tracking-wider">{t.templateKey}</span>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{t.descriptionTemplate}</p>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{t.categoryName}</p>
              </div>
              <button
                type="button"
                onClick={() => setRemoveTarget(t)}
                className="shrink-0 text-xs font-semibold text-red-650 hover:text-red-750 hover:underline"
              >
                Kaldır
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-500 italic">Henüz belediye özel şablon yok; vatandaşlar sistem varsayılanlarını görür.</p>
      )}

      <form onSubmit={create} className="mt-5 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-350">Yeni belediye şablonu</p>
        <div>
          <input
            className={inputClass}
            placeholder="Anahtar (ör. pothole)"
            value={form.templateKey}
            onChange={(e) => setForm((f) => ({ ...f, templateKey: e.target.value }))}
            required
          />
        </div>
        <div>
          <input
            className={inputClass}
            placeholder="Başlık (kart üzerinde)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </div>
        <div>
          <textarea
            className={inputClass}
            rows={3}
            placeholder="Örnek açıklama metni"
            value={form.descriptionTemplate}
            onChange={(e) => setForm((f) => ({ ...f, descriptionTemplate: e.target.value }))}
            required
          />
        </div>
        <div>
          <select
            className={inputClass}
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
        >
          Ekle
        </button>
      </form>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Şablonu kaldır"
        message={removeTarget ? `"${removeTarget.title}" şablonunu devre dışı bırakmak istiyor musunuz?` : ''}
        confirmLabel="Kaldır"
        tone="danger"
        busy={removing}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoveTarget(null)}
      />
    </section>
  );
}
