import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Edit2, Globe, Plus, Search, ShieldAlert, Trash2 } from 'lucide-react';
import axios from 'axios';
import api from '../api';
import { departmentPublicUrl } from '../lib/branding';

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  municipalityId?: string | null;
  municipalityName?: string | null;
  municipalitySlug?: string | null;
  publicPath?: string | null;
}

type MunicipalityOption = {
  id: string;
  name: string;
  slug: string;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function errorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback;
  return String((err.response?.data as { message?: string } | undefined)?.message ?? fallback);
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);
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
        const superAdmin = roles.includes('ROLE_SUPER_ADMIN');
        setIsSuperAdmin(superAdmin);
        if (superAdmin) {
          api
            .get('/admin/municipalities')
            .then((m) => {
              const rows = (m.data.data as { id: string; displayName?: string | null; name: string; slug: string }[]).map((row) => ({
                id: row.id,
                name: (row.displayName && String(row.displayName).trim()) || row.name,
                slug: row.slug,
              }));
              setMunicipalities(rows);
            })
            .catch(() => setMunicipalities([]));
        }
      })
      .catch(() => setIsSuperAdmin(false));
  }, []);

  const selectedMunicipality = useMemo(
    () => municipalities.find((municipality) => municipality.id === municipalityId) ?? null,
    [municipalities, municipalityId],
  );

  const previewMunicipalitySlug = editingDept?.municipalitySlug ?? selectedMunicipality?.slug ?? '';
  const previewSlug = slugify(slug || name);
  const previewUrl =
    previewMunicipalitySlug && previewSlug
      ? departmentPublicUrl(previewMunicipalitySlug, previewSlug)
      : null;

  const openNewModal = () => {
    setEditingDept(null);
    setName('');
    setSlug('');
    setDescription('');
    setIsActive(true);
    setMunicipalityId('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setSlug(dept.slug);
    setDescription(dept.description || '');
    setIsActive(dept.active);
    setMunicipalityId(dept.municipalityId ?? '');
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (isSuperAdmin && !editingDept && !municipalityId) {
      setFormError('Super admin olarak yeni departman eklerken belediye secmelisiniz.');
      return;
    }

    setSaving(true);
    try {
      if (editingDept) {
        await api.patch(`/departments/${editingDept.id}`, {
          name,
          slug: slug.trim() || null,
          description,
          isActive,
        });
      } else {
        const body: Record<string, unknown> = {
          name,
          slug: slug.trim() || null,
          description,
        };
        if (isSuperAdmin && municipalityId) {
          body.municipalityId = municipalityId;
        }
        await api.post('/departments', body);
      }
      await fetchDepartments();
      closeModal();
    } catch (err: unknown) {
      setFormError(errorMessage(err, 'Bir hata olustu.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, departmentName: string) => {
    if (!window.confirm(`"${departmentName}" departmanini pasif yapmak istediginize emin misiniz?`)) return;
    try {
      await api.delete(`/departments/${id}`);
      await fetchDepartments();
    } catch {
      window.alert('Silme islemi basarisiz oldu');
    }
  };

  const filtered = departments.filter((department) => {
    const q = search.toLowerCase();
    return (
      department.name.toLowerCase().includes(q) ||
      department.slug.toLowerCase().includes(q) ||
      String(department.municipalityName ?? '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Yukleniyor...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="kentiva-eyebrow">Cok departmanli yapi</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Departmanlar</h2>
          <p className="mt-1 max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-400">
            Mudurlukleri, URL anahtarlarini ve kamuya acik departman yollarini tek ekrandan yonetin.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Yeni departman
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Toplam" value={String(departments.length)} helper="Tum departmanlar" />
        <StatCard
          label="Aktif"
          value={String(departments.filter((department) => department.active).length)}
          helper="Kullanimdaki departmanlar"
        />
        <StatCard
          label="URL hazir"
          value={String(departments.filter((department) => department.slug && department.municipalitySlug).length)}
          helper="Path tabanli erisim"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200/90 bg-gradient-to-r from-white via-slate-50 to-amber-50 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">URL stratejisi</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Onerilen model: <code>&lt;tenant&gt;.alanadiniz/departments/&lt;slug&gt;</code>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Belediye hostu subdomain, departmanlar ise ayni host altinda path olarak calisir.
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Departman, slug veya belediye ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-slate-50/60 text-slate-500 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Departman</th>
                <th className="px-6 py-4 font-medium">Slug / URL</th>
                <th className="px-6 py-4 font-medium">Belediye</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 text-right font-medium">Islemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map((department) => {
                const publicUrl =
                  department.municipalitySlug && department.slug
                    ? departmentPublicUrl(department.municipalitySlug, department.slug)
                    : null;
                return (
                  <tr key={department.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white">{department.name}</p>
                          <p className="max-w-xs truncate text-xs text-slate-500 dark:text-slate-400" title={department.description}>
                            {department.description || 'Aciklama eklenmedi'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {department.slug}
                        </p>
                        {publicUrl ? (
                          <a
                            href={publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-[20rem] items-center gap-1 truncate text-xs font-medium text-primary hover:underline"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            {publicUrl}
                          </a>
                        ) : (
                          <p className="text-xs text-slate-400">URL henuz hazir degil</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {department.municipalityName || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          department.active
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20'
                            : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-400 dark:ring-rose-400/20'
                        }`}
                      >
                        {department.active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(department)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:text-primary"
                          title="Duzenle"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {department.active && (
                          <button
                            onClick={() => handleDelete(department.id, department.name)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:text-rose-600"
                            title="Pasif yap"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {editingDept ? 'Departman duzenle' : 'Yeni departman'}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Her departmanin path tabanli kamu yolu bu ekranda belirlenir.
                </p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-500">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {formError && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {isSuperAdmin && !editingDept && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Belediye *</label>
                  <select
                    required
                    value={municipalityId}
                    onChange={(e) => setMunicipalityId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">— Belediye secin —</option>
                    {municipalities.map((municipality) => (
                      <option key={municipality.id} value={municipality.id}>
                        {municipality.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Departman adi *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      setName(nextName);
                      if (!slug.trim()) {
                        setSlug(slugify(nextName));
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder="Orn: Fen Isleri Mudurlugu"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    URL anahtari
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder="fen-isleri"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Aciklama</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="Departman hakkinda kisa bilgi..."
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Kamu yolu onizleme
                </p>
                <p className="mt-2 break-all text-sm font-semibold text-slate-900 dark:text-white">
                  {previewUrl ?? 'Once belediye ve slug secin'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Bu yol, departman odakli kampanya veya yonlendirme linklerinde kullanilabilir.
                </p>
              </div>

              {editingDept && (
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Aktif kalsin
                </label>
              )}

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
                  disabled={saving}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
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

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
}
