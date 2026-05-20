import React, { useEffect, useState } from 'react';
import { BarChart3, Pencil, Plus, Search, Trash2, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import api from '../api';

export interface SurveyDetail {
  id: string;
  title: string;
  description: string;
  option1: string;
  option2: string;
  option3?: string | null;
  option4?: string | null;
  active: boolean;
  voted: boolean;
  votedOption?: number | null;
  option1Count: number;
  option2Count: number;
  option3Count: number;
  option4Count: number;
  totalVotes: number;
}

interface SurveysPageProps {
  canManage: boolean;
}

export default function SurveysPage({ canManage }: SurveysPageProps) {
  const [surveys, setSurveys] = useState<SurveyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [optionsLocked, setOptionsLocked] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [option3, setOption3] = useState('');
  const [option4, setOption4] = useState('');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function fetchSurveys() {
    try {
      const res = await api.get('/municipalities/me/surveys');
      setSurveys(res.data.data);
    } catch (err) {
      console.error('Failed to fetch surveys', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void fetchSurveys();
    });
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setOptionsLocked(false);
    setTitle('');
    setDescription('');
    setOption1('');
    setOption2('');
    setOption3('');
    setOption4('');
    setActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: SurveyDetail) => {
    setEditingId(s.id);
    setOptionsLocked(s.totalVotes > 0);
    setTitle(s.title);
    setDescription(s.description ?? '');
    setOption1(s.option1);
    setOption2(s.option2);
    setOption3(s.option3 ?? '');
    setOption4(s.option4 ?? '');
    setActive(s.active);
    setFormError('');
    setIsModalOpen(true);
  };

  const buildPayload = () => ({
    title,
    description,
    option1,
    option2,
    option3: option3.trim() || null,
    option4: option4.trim() || null,
    active,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!option1.trim() || !option2.trim()) {
      setFormError('En az 2 seçenek tanımlamalısınız.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/municipalities/me/surveys/${editingId}`, buildPayload());
      } else {
        await api.post('/municipalities/me/surveys', buildPayload());
      }
      await fetchSurveys();
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(
        axios.isAxiosError(err)
          ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Bir hata oluştu')
          : 'Bir hata oluştu'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (s: SurveyDetail) => {
    if (!canManage) return;
    try {
      await api.put(`/municipalities/me/surveys/${s.id}`, {
        title: s.title,
        description: s.description,
        option1: s.option1,
        option2: s.option2,
        option3: s.option3 ?? null,
        option4: s.option4 ?? null,
        active: !s.active,
      });
      await fetchSurveys();
    } catch {
      alert('Durum güncellenemedi');
    }
  };

  const handleDelete = async (id: string, survTitle: string) => {
    if (!canManage) return;
    if (window.confirm(`"${survTitle}" anketini silmek istediğinize emin misiniz?`)) {
      try {
        await api.delete(`/municipalities/me/surveys/${id}`);
        fetchSurveys();
      } catch {
        alert('Silme işlemi başarısız oldu');
      }
    }
  };

  const filtered = surveys.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  const getPercent = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="kentiva-eyebrow">Katılım</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Belediye Anketleri</h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Vatandaşların oylayabileceği anketler oluşturun ve sonuçları izleyin.
            {!canManage && ' (Salt okunur — yalnızca belediye admini düzenleyebilir.)'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={openNewModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Yeni Anket
          </button>
        )}
      </div>

      <div className="mb-6 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Anket ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 transition-all hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => handleToggleActive(s)}
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                    s.active
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400'
                      : 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-700 dark:text-slate-400'
                  } ${canManage ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                >
                  {s.active ? 'Aktif' : 'Pasif'}
                </button>

                {canManage && (
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                      title="Düzenle"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id, s.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 leading-snug">{s.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{s.description}</p>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">{s.option1}</span>
                    <span className="text-slate-900 dark:text-white">
                      {s.option1Count} Oy ({getPercent(s.option1Count, s.totalVotes)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(s.option1Count, s.totalVotes)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">{s.option2}</span>
                    <span className="text-slate-900 dark:text-white">
                      {s.option2Count} Oy ({getPercent(s.option2Count, s.totalVotes)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(s.option2Count, s.totalVotes)}%` }} />
                  </div>
                </div>
                {s.option3 && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">{s.option3}</span>
                      <span className="text-slate-900 dark:text-white">
                        {s.option3Count} Oy ({getPercent(s.option3Count, s.totalVotes)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(s.option3Count, s.totalVotes)}%` }} />
                    </div>
                  </div>
                )}
                {s.option4 && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">{s.option4}</span>
                      <span className="text-slate-900 dark:text-white">
                        {s.option4Count} Oy ({getPercent(s.option4Count, s.totalVotes)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(s.option4Count, s.totalVotes)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs font-medium text-slate-400">
              <div className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                <span>Toplam Katılım</span>
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{s.totalVotes} Vatandaş</span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">Kayıt bulunamadı.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">
                {editingId ? 'Anketi Düzenle' : 'Yeni Anket Yayınla'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-500">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {formError && (
                <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-lg text-sm flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {optionsLocked && (
                <p className="mb-4 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                  Bu ankete oy verildiği için seçenek metinleri değiştirilemez. Başlık, açıklama ve yayın durumu güncellenebilir.
                </p>
              )}

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Anket Başlığı *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açıklama</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white mb-3">Seçenekler</h4>
                  <div className="space-y-3">
                    {(['option1', 'option2', 'option3', 'option4'] as const).map((key, idx) => {
                      const labels = ['Seçenek 1 *', 'Seçenek 2 *', 'Seçenek 3 (Opsiyonel)', 'Seçenek 4 (Opsiyonel)'];
                      const values = [option1, option2, option3, option4];
                      const setters = [setOption1, setOption2, setOption3, setOption4];
                      const required = idx < 2;
                      return (
                        <div key={key}>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">{labels[idx]}</label>
                          <input
                            type="text"
                            required={required && !optionsLocked}
                            disabled={optionsLocked}
                            value={values[idx]}
                            onChange={(e) => setters[idx](e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white disabled:opacity-60"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {editingId && (
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    Yayında (aktif)
                  </label>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Yayınla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
