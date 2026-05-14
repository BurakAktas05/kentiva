import React, { useEffect, useState } from 'react';
import { Building2, Plus, Search, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import api from '../api';

export interface Department {
  id: string;
  name: string;
  description: string;
  active: boolean;
  municipalityId?: string | null;
  municipalityName?: string | null;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [municipalities, setMunicipalities] = useState<{ id: string; name: string }[]>([]);
  const [municipalityId, setMunicipalityId] = useState('');

  async function fetchDepartments() {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data);
    } catch (err) {
      console.error('Failed to fetch departments', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void fetchDepartments();
    });
    api
      .get('/auth/me')
      .then((res) => {
        const roles: string[] = res.data.data?.roles ?? [];
        const superA = roles.includes('ROLE_SUPER_ADMIN');
        setIsSuperAdmin(superA);
        if (superA) {
          api
            .get('/admin/municipalities')
            .then((m) => {
              const rows = (m.data.data as { id: string; displayName?: string | null; name: string }[]).map((r) => ({
                id: r.id,
                name: (r.displayName && String(r.displayName).trim()) || r.name,
              }));
              setMunicipalities(rows);
            })
            .catch(() => setMunicipalities([]));
        }
      })
      .catch(() => setIsSuperAdmin(false));
  }, []);

  const openNewModal = () => {
    setEditingDept(null);
    setName('');
    setDescription('');
    setIsActive(true);
    setMunicipalityId('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setIsActive(dept.active);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (isSuperAdmin && !editingDept && !municipalityId) {
      setFormError('Süper admin olarak yeni departman eklerken belediye seçmelisiniz.');
      return;
    }
    setSaving(true);

    try {
      if (editingDept) {
        await api.patch(`/departments/${editingDept.id}`, { name, description, isActive });
      } else {
        const body: Record<string, unknown> = { name, description };
        if (isSuperAdmin && municipalityId) body.municipalityId = municipalityId;
        await api.post('/departments', body);
      }
      await fetchDepartments();
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

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`"${name}" departmanını silmek (pasif yapmak) istediğinize emin misiniz?`)) {
      try {
        await api.delete(`/departments/${id}`);
        fetchDepartments();
      } catch {
        alert('Silme işlemi başarısız oldu');
      }
    }
  };

  const filtered = departments.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Yapı</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Departmanlar</h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Belediye müdürlüklerini ve saha ekiplerinin bağlı olduğu departmanları yönetin.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Yeni Departman
        </button>
      </div>

      <div className="mb-6 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Departman ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Departman Adı</th>
                <th className="px-6 py-4 font-medium">Belediye</th>
                <th className="px-6 py-4 font-medium">Açıklama</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map(dept => (
                <tr key={dept.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{dept.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs max-w-[10rem] truncate" title={dept.municipalityName ?? ''}>
                    {dept.municipalityName || '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-500 truncate max-w-xs" title={dept.description}>
                    {dept.description || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      dept.active 
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20' 
                        : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-400 dark:ring-rose-400/20'
                    }`}>
                      {dept.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(dept)}
                        className="p-1.5 text-slate-400 hover:text-primary transition-colors" title="Düzenle"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {dept.active && (
                        <button 
                          onClick={() => handleDelete(dept.id, dept.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors" title="Sil (Pasif Yap)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
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

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingDept ? 'Departman Düzenle' : 'Yeni Departman'}
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
                {isSuperAdmin && !editingDept && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Belediye *
                    </label>
                    <select
                      required
                      value={municipalityId}
                      onChange={(e) => setMunicipalityId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-900 dark:border-slate-700 bg-white"
                    >
                      <option value="">— Belediye seçin —</option>
                      {municipalities.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Departman Adı *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-900 dark:border-slate-700"
                    placeholder="Örn: Fen İşleri Müdürlüğü"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Açıklama
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-900 dark:border-slate-700"
                    placeholder="Departman hakkında kısa bilgi..."
                  />
                </div>

                {editingDept && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">
                      Aktif (Pasif yapıldığında atamalar kısıtlanır)
                    </label>
                  </div>
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
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
