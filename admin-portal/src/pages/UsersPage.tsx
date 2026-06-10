import React, { useEffect, useState } from 'react';
import { Plus, Search, ShieldAlert, UserX } from 'lucide-react';
import axios from 'axios';
import api from '../api';
import type { Department } from './DepartmentsPage';

interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  roles: string[];
  district: string;
  reputationScore?: number;
  reputationLevel?: string;
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [role, setRole] = useState('ROLE_FIELD_OFFICER');

  // Suspension modal states
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendingUser, setSuspendingUser] = useState<UserResponse | null>(null);
  const [suspendDuration, setSuspendDuration] = useState(30);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendError, setSuspendError] = useState('');
  const [suspending, setSuspending] = useState(false);

  const openSuspendModal = (user: UserResponse) => {
    setSuspendingUser(user);
    setSuspendDuration(30);
    setSuspendReason('');
    setSuspendError('');
    setIsSuspendModalOpen(true);
  };

  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendingUser) return;
    setSuspendError('');
    setSuspending(true);

    try {
      await api.post(`/users/${suspendingUser.id}/suspend`, {
        durationDays: suspendDuration,
        reason: suspendReason.trim()
      });
      await fetchData();
      setIsSuspendModalOpen(false);
    } catch (err: unknown) {
      setSuspendError(
        axios.isAxiosError(err)
          ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Askıya alma işlemi başarısız oldu.')
          : 'Askıya alma işlemi başarısız oldu.'
      );
    } finally {
      setSuspending(false);
    }
  };

  async function fetchData() {
    setLoading(true);
    setLoadError(null);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/users'),
        api.get('/departments')
      ]);
      setUsers(usersRes.data.data?.content ?? []);
      setDepartments(deptsRes.data.data?.content ?? []);
    } catch (err) {
      console.error('Failed to fetch data', err);
      setLoadError('Personel listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData();
    });
  }, []);

  const openNewModal = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setPhoneNumber('');
    setDepartmentId('');
    setRole('ROLE_FIELD_OFFICER');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    
    try {
      await api.post('/users', { 
        firstName, 
        lastName, 
        email, 
        password, 
        phoneNumber, 
        departmentId: departmentId || undefined,
        roleNames: [role]
      });
      await fetchData();
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

  const handleToggleEnabled = async (userId: string) => {
    if (window.confirm('Kullanıcının durumunu değiştirmek istediğinize emin misiniz?')) {
      try {
        await api.patch(`/users/${userId}/toggle-enabled`);
        fetchData();
      } catch {
        alert('İşlem başarısız');
      }
    }
  };

  const filtered = users.filter(u => 
    (u.firstName + ' ' + u.lastName).toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;
  }

  if (loadError) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{loadError}</p>
        <button
          type="button"
          onClick={() => void fetchData()}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    'ROLE_SUPER_ADMIN': 'Süper Admin',
    'ROLE_ADMIN': 'Admin',
    'ROLE_WHITE_DESK': 'Beyaz Masa',
    'ROLE_DEPT_MANAGER': 'Birim Müdürü',
    'ROLE_FIELD_OFFICER': 'Saha Görevlisi',
    'ROLE_CITIZEN': 'Vatandaş'
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="kentiva-eyebrow">Ekip</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Personeller</h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Belediyenizdeki personelleri yönetin ve departmanlara atayın.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Yeni Personel
        </button>
      </div>

      <div className="mb-6 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="İsim veya e-posta ile ara..."
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
                <th className="px-6 py-4 font-medium">Ad Soyad</th>
                <th className="px-6 py-4 font-medium">İletişim</th>
                <th className="px-6 py-4 font-medium">Roller</th>
                <th className="px-6 py-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300 font-bold uppercase">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div>
                        <span className="font-medium text-slate-900 dark:text-white block">
                          {user.firstName} {user.lastName}
                        </span>
                        {user.roles.includes('ROLE_CITIZEN') && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                            Puan: {user.reputationScore ?? 100} · {user.reputationLevel ?? 'Yeni Üye'}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    <div>{user.email}</div>
                    <div className="text-xs">{user.phoneNumber || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5 flex-wrap items-center">
                      {user.roles.map(r => (
                        <span key={r} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                          {roleLabels[r] || r}
                        </span>
                      ))}
                      {user.suspendedUntil && new Date(user.suspendedUntil) > new Date() && (
                        <span 
                          className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50"
                          title={`Gerekçe: ${user.suspensionReason}`}
                        >
                          Askıya Alındı ({new Date(user.suspendedUntil).toLocaleDateString('tr-TR')})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleToggleEnabled(user.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors" title="Durumu Değiştir"
                    >
                      <ShieldAlert className="h-4 w-4" />
                    </button>
                    {user.roles.includes('ROLE_CITIZEN') && (
                      <button 
                        onClick={() => openSuspendModal(user)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors ml-1" title="Vatandaşı Askıya Al"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Yeni Personel</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-500">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-sm flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Ad *</label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="kentiva-input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Soyad *</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="kentiva-input" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">E-posta *</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="kentiva-input" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Şifre *</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="kentiva-input" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="kentiva-input" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Rol *</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="kentiva-input">
                  <option value="ROLE_FIELD_OFFICER">Saha Görevlisi</option>
                  <option value="ROLE_DEPT_MANAGER">Birim Müdürü</option>
                  <option value="ROLE_WHITE_DESK">Beyaz Masa</option>
                  <option value="ROLE_ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Departman (Opsiyonel)</label>
                <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="kentiva-input">
                  <option value="">-- Departman Seçin --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.municipalityName ? ` — ${d.municipalityName}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="kentiva-btn kentiva-btn-secondary">İptal</button>
                <button type="submit" disabled={saving} className="kentiva-btn kentiva-btn-primary">{saving ? 'Ekleniyor...' : 'Ekle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Suspend Modal */}
      {isSuspendModalOpen && suspendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vatandaşı Askıya Al</h3>
              <button onClick={() => setIsSuspendModalOpen(false)} className="text-slate-400 hover:text-slate-500">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSuspendSubmit} className="p-6 space-y-4">
              {suspendError && (
                <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-sm flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{suspendError}</span>
                </div>
              )}

              <p className="text-sm text-slate-600 dark:text-slate-400">
                <strong>{suspendingUser.firstName} {suspendingUser.lastName}</strong> ({suspendingUser.email}) adlı vatandaşın ihbar gönderme yetkisini geçici olarak askıya alıyorsunuz.
              </p>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Süre (Gün) *</label>
                <select 
                  value={suspendDuration} 
                  onChange={e => setSuspendDuration(Number(e.target.value))} 
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value={7}>7 Gün (1 Hafta)</option>
                  <option value={15}>15 Gün</option>
                  <option value={30}>30 Gün (1 Ay)</option>
                  <option value={90}>90 Gün (3 Ay)</option>
                  <option value={180}>180 Gün (6 Ay)</option>
                  <option value={365}>365 Gün (1 Yıl)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Askıya Alma Gerekçesi *</label>
                <textarea 
                  required 
                  value={suspendReason} 
                  onChange={e => setSuspendReason(e.target.value)} 
                  rows={4}
                  placeholder="Kötü niyetli kullanım gerekçesini detaylandırın (vatandaşa bildirim olarak gidecektir)..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 leading-relaxed resize-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsSuspendModalOpen(false)} className="kentiva-btn kentiva-btn-secondary">İptal</button>
                <button type="submit" disabled={suspending || !suspendReason.trim()} className="kentiva-btn kentiva-btn-primary bg-amber-600 hover:bg-amber-700 focus:ring-amber-500">
                  {suspending ? 'İşleniyor...' : 'Askıya Al'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
