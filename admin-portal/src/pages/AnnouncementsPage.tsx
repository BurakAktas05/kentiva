import React, { useEffect, useState } from 'react';
import { Megaphone, Pencil, Plus, Search, Trash2, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import api from '../api';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  active: boolean;
  startsAt: string;
  endsAt?: string | null;
}

interface AnnouncementsPageProps {
  canManage: boolean;
}

export default function AnnouncementsPage({ canManage }: AnnouncementsPageProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function fetchAnnouncements() {
    try {
      const res = await api.get('/municipalities/me/announcements');
      setAnnouncements(res.data.data);
    } catch (err) {
      console.error('Failed to fetch announcements', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void fetchAnnouncements();
    });
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setImageUrl('');
    setActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (ann: Announcement) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setContent(ann.content);
    setImageUrl(ann.imageUrl ?? '');
    setActive(ann.active);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    const payload = { title, content, imageUrl: imageUrl.trim() || null, active };

    try {
      if (editingId) {
        await api.put(`/municipalities/me/announcements/${editingId}`, payload);
      } else {
        await api.post('/municipalities/me/announcements', payload);
      }
      await fetchAnnouncements();
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

  const handleToggleActive = async (ann: Announcement) => {
    if (!canManage) return;
    try {
      await api.put(`/municipalities/me/announcements/${ann.id}`, {
        title: ann.title,
        content: ann.content,
        imageUrl: ann.imageUrl ?? null,
        active: !ann.active,
      });
      await fetchAnnouncements();
    } catch {
      alert('Durum güncellenemedi');
    }
  };

  const handleDelete = async (id: string, annTitle: string) => {
    if (!canManage) return;
    if (window.confirm(`"${annTitle}" duyurusunu silmek istediğinize emin misiniz?`)) {
      try {
        await api.delete(`/municipalities/me/announcements/${id}`);
        fetchAnnouncements();
      } catch {
        alert('Silme işlemi başarısız oldu');
      }
    }
  };

  const filtered = announcements.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="kentiva-eyebrow">İletişim</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Belediye Duyuruları</h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Mobil uygulamada vatandaşlara gösterilecek resmi duyuruları yayınlayın.
            {!canManage && ' (Salt okunur — yalnızca belediye admini düzenleyebilir.)'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={openNewModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Yeni Duyuru
          </button>
        )}
      </div>

      <div className="mb-6 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Duyuru ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Görsel / Başlık</th>
                <th className="px-6 py-4 font-medium">İçerik Özeti</th>
                <th className="px-6 py-4 font-medium">Yayın Tarihi</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map((ann) => (
                <tr key={ann.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {ann.imageUrl ? (
                        <img
                          src={ann.imageUrl}
                          alt={ann.title}
                          className="h-10 w-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300';
                          }}
                        />
                      ) : (
                        <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300 shrink-0">
                          <Megaphone className="h-5 w-5" />
                        </div>
                      )}
                      <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]" title={ann.title}>
                        {ann.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 truncate max-w-sm" title={ann.content}>
                    {ann.content}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs">
                    {new Date(ann.startsAt).toLocaleString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => handleToggleActive(ann)}
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        ann.active
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20'
                          : 'bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-700 dark:text-slate-400'
                      } ${canManage ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-80'}`}
                      title={canManage ? 'Durumu değiştirmek için tıklayın' : undefined}
                    >
                      {ann.active ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canManage && (
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(ann)}
                          className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ann.id, ann.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">
                {editingId ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Yayınla'}
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

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Duyuru Başlığı *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    placeholder="Örn: Kent Parkı Açılış Töreni"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Görsel URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Duyuru İçeriği *
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    placeholder="Duyuru detaylı metnini buraya yazın..."
                  />
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

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700"
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
