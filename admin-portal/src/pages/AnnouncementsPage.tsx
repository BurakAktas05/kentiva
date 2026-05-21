import React, { useEffect, useState } from 'react';
import { ImagePlus, Megaphone, Pencil, Plus, Search, ShieldAlert, Trash2, UploadCloud, X } from 'lucide-react';
import axios from 'axios';
import api from '../api';
import ContentWorkspaceTabs from '../components/ContentWorkspaceTabs';
import { resolveMediaUrl } from '../lib/env';

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

function errorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback;
  return String((err.response?.data as { message?: string } | undefined)?.message ?? fallback);
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
  const [imageUploading, setImageUploading] = useState(false);

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

  const resetModal = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setImageUrl('');
    setActive(true);
    setFormError('');
  };

  const openNewModal = () => {
    resetModal();
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

  const closeModal = () => {
    if (saving || imageUploading) return;
    setIsModalOpen(false);
    resetModal();
  };

  const uploadAnnouncementImage = async (file: File) => {
    setImageUploading(true);
    setFormError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/municipalities/me/announcements/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImageUrl(String(res.data.data ?? ''));
    } catch (err: unknown) {
      setFormError(errorMessage(err, 'Gorsel yuklenemedi.'));
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await uploadAnnouncementImage(file);
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
      resetModal();
    } catch (err: unknown) {
      setFormError(errorMessage(err, 'Bir hata olustu.'));
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
      window.alert('Durum guncellenemedi');
    }
  };

  const handleDelete = async (id: string, annTitle: string) => {
    if (!canManage) return;
    if (!window.confirm(`"${annTitle}" duyurusunu silmek istediginize emin misiniz?`)) return;
    try {
      await api.delete(`/municipalities/me/announcements/${id}`);
      await fetchAnnouncements();
    } catch {
      window.alert('Silme islemi basarisiz oldu');
    }
  };

  const filtered = announcements.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Yukleniyor...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="kentiva-eyebrow">Icerik merkezi</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Belediye duyurulari
          </h2>
          <p className="mt-1 max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-400">
            Mobil uygulamada vatandasa gorunecek resmi duyurulari daha okunakli kartlar ve gorsel yukleme akisi ile
            yonetin.
            {!canManage && ' Salt okunur moddasiniz.'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={openNewModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Yeni duyuru
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200/90 bg-gradient-to-r from-white via-slate-50 to-sky-50 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <ContentWorkspaceTabs />
        <div className="grid min-w-[220px] flex-1 gap-3 sm:grid-cols-2 xl:max-w-xl">
          <ContentStat
            label="Toplam duyuru"
            value={String(announcements.length)}
            helper="Tum kayitlar"
          />
          <ContentStat
            label="Yayinda"
            value={String(announcements.filter((ann) => ann.active).length)}
            helper="Aktif gorunenler"
          />
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Duyuru ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-slate-50/70 text-slate-500 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Gorsel / Baslik</th>
                <th className="px-6 py-4 font-medium">Icerik ozeti</th>
                <th className="px-6 py-4 font-medium">Yayin tarihi</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 text-right font-medium">Islemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map((ann) => (
                <tr key={ann.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {ann.imageUrl ? (
                        <img
                          src={resolveMediaUrl(ann.imageUrl)}
                          alt={ann.title}
                          className="h-12 w-20 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300';
                          }}
                        />
                      ) : (
                        <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300">
                          <Megaphone className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-white" title={ann.title}>
                          {ann.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {ann.imageUrl ? 'Gorselli duyuru' : 'Metin odakli duyuru'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-sm px-6 py-4 text-slate-500 dark:text-slate-400">
                    <p className="truncate" title={ann.content}>
                      {ann.content}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">
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
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                        ann.active
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20'
                          : 'bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-700 dark:text-slate-400'
                      } ${canManage ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-80'}`}
                    >
                      {ann.active ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canManage && (
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(ann)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:text-primary"
                          title="Duzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ann.id, ann.title)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:text-rose-600"
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
                    Kayit bulunamadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {editingId ? 'Duyuruyu duzenle' : 'Yeni duyuru yayinla'}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  URL yerine dogrudan gorsel yukleyerek daha zengin kartlar olusturun.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              {formError && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Duyuru basligi *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      placeholder="Orn: Kent parki acilis toreni"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Duyuru icerigi *
                    </label>
                    <textarea
                      rows={8}
                      required
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      placeholder="Duyuru detayli metnini buraya yazin..."
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
                      Yayinda (aktif)
                    </label>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Kapak gorseli</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      JPG, PNG veya WEBP. En fazla 8 MB.
                    </p>
                  </div>

                  {imageUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                      <img
                        src={resolveMediaUrl(imageUrl)}
                        alt="Duyuru onizleme"
                        className="h-44 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-950">
                      <div className="text-center">
                        <ImagePlus className="mx-auto h-8 w-8" />
                        <p className="mt-2 text-xs font-medium">Henuz gorsel secilmedi</p>
                      </div>
                    </div>
                  )}

                  <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary-hover">
                    <UploadCloud className="h-4 w-4" />
                    {imageUploading ? 'Yukleniyor...' : 'Gorsel yukle'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => void handleImageChange(e)}
                      className="hidden"
                      disabled={imageUploading}
                    />
                  </label>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Gorseli kaldir
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Iptal
                </button>
                <button
                  type="submit"
                  disabled={saving || imageUploading}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : editingId ? 'Guncelle' : 'Yayinla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ContentStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
}
