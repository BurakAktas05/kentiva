import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, KeyRound, Shield } from 'lucide-react';
import axios from 'axios';
import api from '../api';

type SetupStatus = {
  needsBootstrap: boolean;
  bootstrapConfigured: boolean;
};

export default function SetupPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [setupToken, setSetupToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get('/setup/status')
      .then((res) => {
        const data = res.data.data as SetupStatus;
        setStatus(data);
        if (!data.needsBootstrap) {
          navigate('/login', { replace: true });
        }
      })
      .catch(() => setError('Kurulum durumu alınamadı.'));
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(
        '/setup/bootstrap-super-admin',
        {
          email,
          password,
          firstName,
          lastName,
          phoneNumber: phone || null,
        },
        { headers: { 'X-Setup-Token': setupToken } },
      );
      navigate('/login', { replace: true, state: { setupDone: true } });
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? String((err.response?.data as { message?: string })?.message ?? 'Kurulum başarısız')
          : 'Kurulum başarısız',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-slate-950">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Kentiva kurulumu</h1>
            <p className="text-sm text-slate-500">İlk süper admin hesabınızı oluşturun</p>
          </div>
        </div>

        {!status.bootstrapConfigured && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Sunucuda <code className="font-mono text-xs">APP_SETUP_TOKEN</code> tanımlı değil. Railway / .env
            dosyanıza ekleyin.
          </p>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <KeyRound size={14} /> Kurulum anahtarı
            </label>
            <input
              type="password"
              value={setupToken}
              onChange={(e) => setSetupToken(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              placeholder="APP_SETUP_TOKEN değeri"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Ad"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              required
            />
            <input
              placeholder="Soyad"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              required
            />
          </div>
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            required
          />
          <input
            type="tel"
            placeholder="Telefon (opsiyonel)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <input
            type="password"
            placeholder="Şifre (en az 8 karakter)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            required
          />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !status.bootstrapConfigured}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? 'Oluşturuluyor…' : 'Süper admin oluştur'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Zaten hesabınız var mı?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Giriş yapın
          </Link>
        </p>
        <p className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-400">
          <Building2 size={12} /> Yerel geliştirmede: dev profili + admin@kentiva.app / admin123
        </p>
      </div>
    </div>
  );
}

