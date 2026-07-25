import React, { useEffect, useState } from 'react';
import { Gift, Plus, Search, Pencil, Trash2, CheckCircle2, XCircle, ShieldAlert, Star } from 'lucide-react';
import axios from 'axios';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Toast, { type ToastState } from '../components/ui/Toast';

export interface Reward {
  id: string;
  municipalityId: string;
  municipalityName: string;
  title: string;
  description: string;
  pointCost: number;
  stock: number;
  imageUrl: string;
  active: boolean;
}

export interface RedeemedReward {
  id: string;
  rewardId: string;
  rewardTitle: string;
  rewardImageUrl: string | null;
  redemptionCode: string;
  status: string;
  redeemedAt: string;
  userEmail: string;
  userFullName: string;
  userPhone: string | null;
  pointCost: number;
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'rewards' | 'claims'>('rewards');

  // Modal & Form State for Rewards
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pointCost, setPointCost] = useState(100);
  const [stock, setStock] = useState(10);
  const [imageUrl, setImageUrl] = useState('');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Claims State
  const [claims, setClaims] = useState<RedeemedReward[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsSearch, setClaimsSearch] = useState('');
  const [claimsPage, setClaimsPage] = useState(0);
  const [claimsTotalPages, setClaimsTotalPages] = useState(0);

  const [toast, setToast] = useState<ToastState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reward | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [claimAction, setClaimAction] = useState<{ claim: RedeemedReward; status: 'CLAIMED' | 'CANCELLED' } | null>(null);
  const [updatingClaim, setUpdatingClaim] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function fetchRewards() {
    try {
      const res = await api.get('/municipalities/me/rewards');
      setRewards(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch rewards', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClaims(page = 0) {
    setClaimsLoading(true);
    try {
      const res = await api.get('/municipalities/me/rewards/claims', {
        params: { page, size: 10 },
      });
      setClaims(res.data.data?.content || []);
      setClaimsPage(page);
      setClaimsTotalPages(res.data.data?.totalPages || 0);
    } catch (err) {
      console.error('Failed to fetch claims', err);
    } finally {
      setClaimsLoading(false);
    }
  }

  useEffect(() => {
    fetchRewards();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setPointCost(100);
    setStock(10);
    setImageUrl('');
    setActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (r: Reward) => {
    setEditingId(r.id);
    setTitle(r.title);
    setDescription(r.description ?? '');
    setPointCost(r.pointCost);
    setStock(r.stock);
    setImageUrl(r.imageUrl ?? '');
    setActive(r.active);
    setFormError('');
    setIsModalOpen(true);
  };

  const buildPayload = () => ({
    title: title.trim(),
    description: description.trim() || null,
    pointCost,
    stock,
    imageUrl: imageUrl.trim() || null,
    active,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Başlık alanı boş bırakılamaz.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/municipalities/me/rewards/${editingId}`, buildPayload());
      } else {
        await api.post('/municipalities/me/rewards', buildPayload());
      }
      await fetchRewards();
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

  const confirmDeleteReward = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/municipalities/me/rewards/${deleteTarget.id}`);
      await fetchRewards();
      setDeleteTarget(null);
      setToast({ type: 'success', message: 'Ödül silindi.' });
    } catch {
      setToast({ type: 'error', message: 'Silme işlemi başarısız oldu.' });
    } finally {
      setDeleting(false);
    }
  };

  const confirmClaimStatusUpdate = async () => {
    if (!claimAction) return;
    setUpdatingClaim(true);
    try {
      await api.patch(`/municipalities/me/rewards/claims/${claimAction.claim.id}/status`, null, {
        params: { status: claimAction.status },
      });
      await fetchClaims(claimsPage);
      setClaimAction(null);
      setToast({
        type: 'success',
        message: claimAction.status === 'CLAIMED' ? 'Kupon teslim edildi olarak işaretlendi.' : 'Kupon iptal edildi.',
      });
    } catch (err: unknown) {
      setToast({
        type: 'error',
        message: axios.isAxiosError(err)
          ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Durum güncellenemedi.')
          : 'Durum güncellenemedi.',
      });
    } finally {
      setUpdatingClaim(false);
    }
  };

  const filteredRewards = rewards.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredClaims = claims.filter(
    (c) =>
      c.redemptionCode.toLowerCase().includes(claimsSearch.toLowerCase()) ||
      c.userFullName.toLowerCase().includes(claimsSearch.toLowerCase()) ||
      c.userEmail.toLowerCase().includes(claimsSearch.toLowerCase()) ||
      (c.userPhone && c.userPhone.includes(claimsSearch))
  );

  if (loading) {
    return <LoadingState label="Ödüller yükleniyor…" />;
  }

  return (
    <div className="p-6">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div className="mb-6">
        <PageHeader
          eyebrow="Gamification"
          title="Belediye Ödül Merkezi"
          subtitle="Vatandaşların güven puanlarını harcayarak alabilecekleri ödülleri tanımlayın ve talepleri yönetin."
          actions={
            activeTab === 'rewards' ? (
              <Button onClick={openNewModal}>
                <Plus className="h-4 w-4" />
                Yeni Ödül Ekle
              </Button>
            ) : undefined
          }
        />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px ${
            activeTab === 'rewards'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Tanımlı Ödüller ({rewards.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('claims');
            void fetchClaims(0);
          }}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px ${
            activeTab === 'claims'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Kupon Talepleri & İşlemler
        </button>
      </div>

      {activeTab === 'rewards' ? (
        <>
          <div className="mb-6 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Ödül ara (başlık veya açıklama)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRewards.map((r) => (
              <div
                key={r.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md"
              >
                <div>
                  <div className="relative mb-4 aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400">
                    {r.imageUrl ? (
                      <img src={r.imageUrl} alt={r.title} className="h-full w-full object-cover" />
                    ) : (
                      <Gift className="h-10 w-10 text-slate-350" />
                    )}
                    <span className={`absolute top-2.5 right-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      r.active
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-400/10 dark:text-emerald-400'
                        : 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/10 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {r.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1 text-xs font-bold text-primary dark:text-sky-300 bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded-lg">
                      <Star className="h-3.5 w-3.5 fill-primary/10 dark:fill-sky-400/10" /> {r.pointCost} Puan
                    </span>
                    <span className={`text-xs font-semibold ${r.stock > 0 ? 'text-slate-500' : 'text-rose-600'}`}>
                      Stok: {r.stock} adet
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">{r.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">{r.description || 'Açıklama girilmemiş.'}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(r)}
                    className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                    title="Düzenle"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(r)}
                    className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                    title="Sil"
                    aria-label={`${r.title} ödülünü sil`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {filteredRewards.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  title="Ödül bulunamadı"
                  description={search ? 'Arama kriterlerinize uyan ödül bulunamadı.' : 'Henüz ödül tanımlanmamış.'}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        /* Claims List Tab */
        <>
          <div className="mb-6 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Kod veya vatandaş ara..."
              value={claimsSearch}
              onChange={(e) => setClaimsSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                    <th className="px-6 py-4">Kupon Kodu</th>
                    <th className="px-6 py-4">Vatandaş</th>
                    <th className="px-6 py-4">İstenen Ödül</th>
                    <th className="px-6 py-4">Harcanan Puan</th>
                    <th className="px-6 py-4">Tarih</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {filteredClaims.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {c.redemptionCode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{c.userFullName}</p>
                          <p className="text-xs text-slate-500">{c.userEmail}</p>
                          {c.userPhone && <p className="text-xs font-semibold text-primary mt-0.5">{c.userPhone}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{c.rewardTitle}</td>
                      <td className="px-6 py-4 font-bold text-primary dark:text-sky-300">{c.pointCost} Puan</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {c.redeemedAt ? new Date(c.redeemedAt).toLocaleString('tr-TR') : ''}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          c.status === 'CLAIMED'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400'
                            : c.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400'
                        }`}>
                          {c.status === 'REDEEMED' ? 'Bekliyor' : c.status === 'CLAIMED' ? 'Teslim Edildi' : 'İptal Edildi'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {c.status === 'REDEEMED' ? (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => setClaimAction({ claim: c, status: 'CLAIMED' })}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 transition-colors"
                              title="Teslim Edildi İşaretle"
                            >
                              <CheckCircle2 size={14} /> Teslim Et
                            </button>
                            <button
                              onClick={() => setClaimAction({ claim: c, status: 'CANCELLED' })}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-600 transition-colors"
                              title="İptal Et ve İade Et"
                            >
                              <XCircle size={14} /> İptal Et
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">İşlem Tamamlandı</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredClaims.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        {claimsLoading ? (
                          <LoadingState label="Kupon talepleri yükleniyor…" />
                        ) : (
                          <EmptyState title="Kupon talebi bulunamadı" />
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {claimsTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800">
                <button
                  disabled={claimsPage === 0}
                  onClick={() => fetchClaims(claimsPage - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Önceki
                </button>
                <span className="text-xs text-slate-500">Sayfa {claimsPage + 1} / {claimsTotalPages}</span>
                <button
                  disabled={claimsPage >= claimsTotalPages - 1}
                  onClick={() => fetchClaims(claimsPage + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Sonraki
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all border dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2 text-primary dark:text-sky-300">
                <Gift className="h-5 w-5" />
                {editingId ? 'Ödülü Düzenle' : 'Yeni Ödül Ekle'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 text-xl font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {formError && (
                <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-lg text-sm flex items-start gap-2 border border-rose-250">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Ödül Başlığı *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:outline-none"
                    placeholder="Örn: Kent Kafe Çay İkramı"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açıklama</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:outline-none"
                    placeholder="Ödül detayları, nerede geçerli olduğu ve nasıl kullanılacağı..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Puan Maliyeti *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={pointCost}
                      onChange={(e) => setPointCost(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Stok Adedi *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={stock}
                      onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Görsel URL</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:outline-none"
                    placeholder="https://..."
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Aktif (Yayında)
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Ekle'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Ödülü sil"
        message={deleteTarget ? `"${deleteTarget.title}" ödülünü silmek istediğinize emin misiniz?` : ''}
        confirmLabel="Sil"
        tone="danger"
        busy={deleting}
        onConfirm={() => void confirmDeleteReward()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(claimAction)}
        title={claimAction?.status === 'CLAIMED' ? 'Kuponu teslim et' : 'Kuponu iptal et'}
        message={
          claimAction?.status === 'CLAIMED'
            ? 'Bu ödül kuponunu teslim edildi olarak işaretlemek istiyor musunuz?'
            : 'Bu ödül kuponunu iptal edip vatandaşın puanını iade etmek istiyor musunuz?'
        }
        confirmLabel={claimAction?.status === 'CLAIMED' ? 'Teslim Et' : 'İptal Et'}
        tone={claimAction?.status === 'CANCELLED' ? 'danger' : 'primary'}
        busy={updatingClaim}
        onConfirm={() => void confirmClaimStatusUpdate()}
        onCancel={() => setClaimAction(null)}
      />
    </div>
  );
}
