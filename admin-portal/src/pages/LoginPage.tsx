import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  LockKeyhole,
  Shield,
  Sparkles,
  Workflow,
} from 'lucide-react';
import axios from 'axios';
import api, { REFRESH_KEY, TOKEN_KEY } from '../api';
import {
  buildPortalUser,
  type AuthenticatedPortalUser,
  type LoginPortalKind,
  savePreferredLoginPortal,
} from '../lib/auth';

const portalCopy: Record<
  LoginPortalKind,
  {
    eyebrow: string;
    title: string;
    description: string;
    submitLabel: string;
    helpText: string;
    badge: string;
    heroTitle: string;
    heroText: string;
    heroStats: { label: string; value: string }[];
  }
> = {
  'super-admin': {
    eyebrow: 'Platform merkezi',
    title: 'Süper admin girişi',
    description: 'Platform kurulumları, belediye yaşam döngüsü ve SaaS yönetimi için ayrı giriş alanı.',
    submitLabel: 'Platforma gir',
    helpText: 'Bu alan yalnızca merkezi platform süper adminleri içindir.',
    badge: 'Sadece süper admin',
    heroTitle: 'Tüm belediye ağını tek merkezden yönetin.',
    heroText: 'Kurulum, abonelik, marka standardı ve tenant operasyonları platform katmanında ayrı tutulur.',
    heroStats: [
      { label: 'Tenant operasyonu', value: 'Tek merkez' },
      { label: 'Kurulum akışı', value: 'Ayrı giriş' },
    ],
  },
  municipality: {
    eyebrow: 'Belediye çalışma alanı',
    title: 'Belediye paneli girişi',
    description: 'Belediye admini, beyaz masa, müdür ve saha ekibi için operasyon odaklı giriş alanı.',
    submitLabel: 'Çalışma alanına gir',
    helpText: 'Belediyeye bağlı hesaplarla giriş yapın. Süper adminler ayrı kapıdan ilerler.',
    badge: 'Operasyon workspace',
    heroTitle: 'Rapor, duyuru, anket ve ekip akışlarını aynı yerden yürütün.',
    heroText: 'Günlük belediye operasyonu için daha sade, rol bazlı ve departman uyumlu bir giriş deneyimi.',
    heroStats: [
      { label: 'Canlı takip', value: '7/24' },
      { label: 'Rapor akışı', value: 'Gerçek zamanlı' },
    ],
  },
};

function buildPortalError(portal: LoginPortalKind): string {
  return portal === 'super-admin'
    ? 'Bu hesap süper admin giriş alanına uygun değil.'
    : 'Bu hesap belediye çalışma alanına bağlı değil.';
}

function isPortalAllowed(portal: LoginPortalKind, user: AuthenticatedPortalUser): boolean {
  if (portal === 'super-admin') {
    return user.roles.includes('ROLE_SUPER_ADMIN') && !user.municipality;
  }
  return Boolean(user.municipality);
}

export function LoginLandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(135deg,#e2ecf8_0%,#f8fafc_46%,#d7e5f7_100%)] px-6 py-10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(135deg,#020617_0%,#0f172a_48%,#111827_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center gap-8">
        <div className="max-w-3xl">
          <p className="kentiva-eyebrow">Ayrı giriş mimarisi</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">
            Platform yönetimi ile belediye operasyonunu ayırdık.
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600 dark:text-slate-300">
            Süper admin ve belediye ekipleri artık aynı kapıdan girmiyor. Bu ayrım, yetki karışıklığını azaltıyor
            ve SaaS tarafını üretime daha hazır hale getiriyor.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <PortalCard
            portal="super-admin"
            href="/super-admin/login"
            icon={<Shield className="h-5 w-5" />}
            points={[
              'Tenant kurulumları ve yaşam döngüsü',
              'Belediye onboarding ve marka standardı',
              'Platform çapında denetim ve abonelik görünümü',
            ]}
          />
          <PortalCard
            portal="municipality"
            href="/municipality/login"
            icon={<Building2 className="h-5 w-5" />}
            points={[
              'Rapor, ekip ve departman operasyonu',
              'Duyuru, anket ve dışa aktarma akışları',
              'Belediye özelleştirme ve saha koordinasyonu',
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 font-medium shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <Workflow className="h-4 w-4 text-primary" />
            Üretime hazır SaaS akışı
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 font-medium shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Rol bazlı giriş kapıları
          </span>
        </div>
      </div>
    </div>
  );
}

function PortalCard({
  portal,
  href,
  icon,
  points,
}: {
  portal: LoginPortalKind;
  href: string;
  icon: React.ReactNode;
  points: string[];
}) {
  const copy = portalCopy[portal];

  return (
    <Link
      to={href}
      className="group rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_32px_80px_-30px_rgba(11,79,156,0.32)] dark:border-slate-700/80 dark:bg-slate-900/88"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
          {icon}
        </div>
        <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary dark:border-primary/30 dark:bg-primary/12">
          {copy.badge}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          {copy.eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{copy.title}</h2>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{copy.description}</p>
      </div>

      <ul className="mt-5 space-y-2.5">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
        Devam et
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export default function LoginPage({
  portal,
  onLogin,
}: {
  portal: LoginPortalKind;
  onLogin: (user: AuthenticatedPortalUser) => void;
}) {
  const copy = portalCopy[portal];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotStep, setForgotStep] = useState<'off' | 'phone' | 'otp' | 'newpass'>('off');
  const [resetPhone, setResetPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    savePreferredLoginPortal(portal);
    api
      .get('/setup/status')
      .then((res) => {
        if (res.data.data?.needsBootstrap) {
          window.location.href = '/setup';
        }
      })
      .catch(() => {});
  }, [portal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      const nextUser = buildPortalUser(res.data.data);

      if (!isPortalAllowed(portal, nextUser)) {
        setError(buildPortalError(portal));
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        return;
      }

      localStorage.setItem(TOKEN_KEY, res.data.data.accessToken);
      if (res.data.data.refreshToken) {
        localStorage.setItem(REFRESH_KEY, res.data.data.refreshToken);
      }
      savePreferredLoginPortal(portal);
      onLogin(nextUser);
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Giriş yapılamadı')
          : 'Giriş yapılamadı',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setResetLoading(true);
    setResetMsg('');
    try {
      if (forgotStep === 'phone') {
        await api.post('/auth/forgot-password', { phoneNumber: resetPhone });
        setForgotStep('otp');
        setResetMsg('Doğrulama kodu gönderildi.');
      } else if (forgotStep === 'otp') {
        setForgotStep('newpass');
      } else if (forgotStep === 'newpass') {
        await api.post('/auth/reset-password', { phoneNumber: resetPhone, otpCode: otp, newPassword: newPass });
        setResetMsg('Şifre başarıyla sıfırlandı.');
        setTimeout(() => {
          setForgotStep('off');
          setResetMsg('');
        }, 1800);
      }
    } catch (err: unknown) {
      setResetMsg(
        axios.isAxiosError(err)
          ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Hata')
          : 'Hata',
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(140deg,#dce8f7_0%,#f8fafc_44%,#dbeafe_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.2),_transparent_30%),linear-gradient(140deg,#020617_0%,#0f172a_45%,#111827_100%)]">
      <div className="mx-auto flex min-h-screen max-w-7xl items-stretch">
        <section className="relative hidden flex-1 overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-slate-950" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(230,180,34,0.24),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.2),_transparent_24%)]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-16 text-white">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] backdrop-blur-md">
                <LockKeyhole className="h-3.5 w-3.5" />
                {copy.badge}
              </div>
              <h1 className="mt-6 max-w-2xl text-5xl font-black leading-tight tracking-tight">
                {copy.heroTitle}
              </h1>
              <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-200/90">{copy.heroText}</p>
            </div>

            <div className="grid max-w-lg grid-cols-2 gap-4">
              {copy.heroStats.map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                  <p className="text-2xl font-black">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-200/85">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex w-full items-center justify-center px-6 py-10 lg:w-[560px] lg:px-10">
          <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/92 p-8 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.42)] backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/92">
            <div className="mb-8">
              <Link to="/login" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-primary dark:text-slate-400">
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Giriş tipini değiştir
              </Link>
              <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/25">
                {portal === 'super-admin' ? <Shield className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}
              </div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{copy.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{copy.title}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{copy.description}</p>
            </div>

            {forgotStep === 'off' ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="kentiva-label">E-posta</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="kentiva-input !rounded-2xl !py-3.5"
                    placeholder={portal === 'super-admin' ? 'platform@kentiva.app' : 'admin@belediye.gov.tr'}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="kentiva-label">Şifre</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="kentiva-input !rounded-2xl !py-3.5"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {error ? <p className="kentiva-alert-error !rounded-2xl">{error}</p> : null}
                <button type="submit" disabled={submitting} className="kentiva-btn-primary w-full !rounded-2xl !py-4">
                  {submitting ? 'Doğrulanıyor…' : copy.submitLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotStep('phone')}
                  className="w-full text-center text-sm font-semibold text-primary hover:underline"
                >
                  Şifremi unuttum
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                  <Shield className="h-5 w-5" />
                  <h3 className="text-lg font-bold">Şifre sıfırlama</h3>
                </div>
                {forgotStep === 'phone' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Hesabınıza kayıtlı telefon numarasını girin.</p>
                    <input
                      type="tel"
                      value={resetPhone}
                      onChange={(e) => setResetPhone(e.target.value)}
                      className="kentiva-input !rounded-2xl !py-3.5"
                      placeholder="05XX XXX XX XX"
                    />
                  </div>
                )}
                {forgotStep === 'otp' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Telefonunuza gelen 6 haneli doğrulama kodunu girin.</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="kentiva-input !rounded-2xl !py-3.5 text-center text-2xl tracking-[0.45em]"
                      placeholder="000000"
                    />
                  </div>
                )}
                {forgotStep === 'newpass' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Yeni şifrenizi belirleyin.</p>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="kentiva-input !rounded-2xl !py-3.5"
                      placeholder="Yeni şifre"
                      minLength={8}
                    />
                  </div>
                )}
                {resetMsg ? <p className="kentiva-alert-success !rounded-2xl">{resetMsg}</p> : null}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('off');
                      setResetMsg('');
                    }}
                    className="kentiva-btn-secondary flex-1 !rounded-2xl"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={resetLoading}
                    className="kentiva-btn-primary flex-1 !rounded-2xl"
                  >
                    {resetLoading
                      ? 'Bekleyin…'
                      : forgotStep === 'phone'
                        ? 'Kod gönder'
                        : forgotStep === 'otp'
                          ? 'Doğrula'
                          : 'Şifreyi değiştir'}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              {copy.helpText}
            </div>

            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              İlk kurulum mu?{' '}
              <Link to="/setup" className="font-semibold text-primary hover:underline">
                Süper admin oluştur
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
