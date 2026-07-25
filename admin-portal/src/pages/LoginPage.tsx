import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { municipalityPortalUrl, requestedMunicipalitySlug } from '../lib/tenantDomains';
import {
  ArrowRight,
  Building2,
  LockKeyhole,
  Shield,
  CheckCircle2,
  Network,
  BarChart3,
  BadgeCheck,
} from 'lucide-react';
import axios from 'axios';
import api, { clearAuthStorage, setStoredAuthTokens } from '../api';
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

function buildPortalError(portal: LoginPortalKind, user?: AuthenticatedPortalUser): string {
  if (portal === 'super-admin') {
    return 'Bu hesap süper admin giriş alanına uygun değil.';
  }
  if (user && user.municipality && typeof window !== 'undefined') {
    const requestedSlug = requestedMunicipalitySlug();
    if (requestedSlug && user.municipality.slug !== requestedSlug) {
      return `Bu hesap bu çalışma alanına (${requestedSlug}) ait değil.`;
    }
  }
  return 'Bu hesap belediye çalışma alanına bağlı değil.';
}

function isPortalAllowed(portal: LoginPortalKind, user: AuthenticatedPortalUser): boolean {
  if (portal === 'super-admin') {
    return user.roles.includes('ROLE_SUPER_ADMIN') && !user.municipality;
  }
  if (!user.municipality) return false;
  if (typeof window !== 'undefined') {
    const requestedSlug = requestedMunicipalitySlug();
    if (requestedSlug && user.municipality.slug !== requestedSlug) {
      return false;
    }
  }
  return true;
}

export function LoginLandingPage() {
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) {
      setError('Lütfen bir çalışma alanı adı girin.');
      return;
    }
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    window.location.href = municipalityPortalUrl(cleanSlug);
  };

  const quickLinks = [
    { name: 'Gümüşhacıköy Belediyesi', slug: 'gumushacikoy' },
    { name: 'Safranbolu Belediyesi', slug: 'safranbolu' },
    { name: 'Amasya Belediyesi', slug: 'amasya' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,.22),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(11,79,156,.28),transparent_34%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1.1fr_.9fr]">
        <section className="order-2 flex flex-col justify-between px-6 py-8 sm:px-10 lg:order-1 lg:px-16 lg:py-12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-primary shadow-lg shadow-sky-500/20"><Building2 className="h-5 w-5" /></div>
            <div><p className="text-lg font-black tracking-tight">Kentiva</p><p className="text-[9px] font-bold uppercase tracking-[.2em] text-sky-200/70">Akıllı belediye platformu</p></div>
          </div>

          <div className="max-w-2xl py-16 lg:py-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-sky-200"><BadgeCheck className="h-3.5 w-3.5" /> Kurumsal operasyon altyapısı</div>
            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-[-.045em] sm:text-5xl lg:text-6xl">Belediye hizmetlerini tek merkezden yönetin.</h1>
            <p className="mt-6 max-w-xl text-base font-medium leading-7 text-slate-300">Vatandaş taleplerinden saha ekiplerine, yönetici analizlerinden kurumsal iletişime kadar tüm süreçler güvenli ve ölçülebilir bir çalışma alanında.</p>
            <div className="mt-9 grid gap-4 sm:grid-cols-3">
              <TrustItem icon={<Network />} title="Uçtan uca süreç" text="Beyaz masa ve saha koordinasyonu" />
              <TrustItem icon={<BarChart3 />} title="Karar desteği" text="Canlı performans ve SLA takibi" />
              <TrustItem icon={<Shield />} title="Güvenli mimari" text="Rol bazlı, belediyeye özel alan" />
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500">© {new Date().getFullYear()} Kentiva · Güvenli belediye operasyonları</p>
        </section>

        <section className="order-1 flex min-h-screen items-center justify-center border-l border-white/10 bg-white/[.035] px-6 py-12 backdrop-blur-sm sm:px-10 lg:order-2 lg:min-h-0 lg:px-14">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white p-7 text-slate-900 shadow-[0_40px_100px_-30px_rgba(0,0,0,.7)] sm:p-9 dark:bg-slate-900 dark:text-white">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-primary dark:text-sky-300">Güvenli portal erişimi</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.035em]">Çalışma alanınıza girin</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">Belediyenize özel yönetim portalının adresini kullanın.</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="mt-7 space-y-2">
              <label htmlFor="workspace-slug" className="kentiva-label">Kurumsal çalışma alanı</label>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-4 text-slate-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <input
                  id="workspace-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setError('');
                  }}
                  placeholder="belediye-adi"
                  className="kentiva-input !pl-12 !pr-36 !rounded-2xl !py-4 font-semibold text-slate-800 dark:text-white"
                  required
                />
                <div className="absolute right-4 text-[10px] font-black uppercase tracking-[.12em] text-slate-400 select-none">
                  Portal kodu
                </div>
              </div>
              {error && <p className="text-xs font-bold text-rose-500 mt-1">{error}</p>}
              {!error && (
                <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
                  {municipalityPortalUrl(slug.trim() || 'belediye-adi').replace(/^https?:\/\//, '')}
                </p>
              )}
            </div>

            <button type="submit" className="kentiva-btn-primary w-full !rounded-2xl !py-4 flex items-center justify-center gap-2 text-base font-bold shadow-lg shadow-primary/20">
              Çalışma Alanına Git
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>

          {import.meta.env.DEV && <div className="mt-8 border-t border-slate-200/60 pt-6 dark:border-slate-800">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Geliştirme kısayolları</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {quickLinks.map((link) => (
                <button
                  key={link.slug}
                  type="button"
                  onClick={() => setSlug(link.slug)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:border-primary hover:bg-primary/5 transition dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200"
                >
                  {link.name.replace(' Belediyesi', '')}
                </button>
              ))}
            </div>
          </div>}
          <div className="mt-7 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Güvenli bağlantı ve kurumsal veri ayrımı etkin</div>
          <Link to="/super-admin/login" className="mt-6 block text-center text-xs font-bold text-slate-400 transition hover:text-primary">Merkezi sistem yönetimi</Link>
        </div>
        </section>
      </div>
    </div>
  );
}

function TrustItem({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="border-l border-white/15 pl-4"><span className="text-sky-300 [&>svg]:h-5 [&>svg]:w-5">{icon}</span><p className="mt-3 text-sm font-extrabold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{text}</p></div>;
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
        setError(buildPortalError(portal, nextUser));
        clearAuthStorage();
        return;
      }

      setStoredAuthTokens(res.data.data.accessToken, res.data.data.refreshToken ?? null);
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
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/25">
                {portal === 'super-admin' ? <Shield className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}
              </div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{copy.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{copy.title}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{copy.description}</p>
            </div>

            {forgotStep === 'off' ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor={`${portal}-login-email`} className="kentiva-label">E-posta</label>
                    <input
                      id={`${portal}-login-email`}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="kentiva-input !rounded-2xl !py-3.5"
                      placeholder={portal === 'super-admin' ? 'platform@kentiva.app' : 'admin@belediye.gov.tr'}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor={`${portal}-login-password`} className="kentiva-label">Şifre</label>
                    <input
                      id={`${portal}-login-password`}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="kentiva-input !rounded-2xl !py-3.5"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  {error ? <p className="kentiva-alert-error !rounded-2xl">{error}</p> : null}
                  <button type="submit" disabled={submitting} className="kentiva-btn-primary w-full !rounded-2xl !py-4 font-bold shadow-lg shadow-primary/20">
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
                    <label htmlFor="reset-phone" className="text-sm text-slate-500 dark:text-slate-400">Hesabınıza kayıtlı telefon numarasını girin.</label>
                    <input
                      id="reset-phone"
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
                    <label htmlFor="reset-otp" className="text-sm text-slate-500 dark:text-slate-400">Telefonunuza gelen 6 haneli doğrulama kodunu girin.</label>
                    <input
                      id="reset-otp"
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
                    <label htmlFor="reset-new-password" className="text-sm text-slate-500 dark:text-slate-400">En az 12 karakterli yeni şifrenizi belirleyin.</label>
                    <input
                      id="reset-new-password"
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="kentiva-input !rounded-2xl !py-3.5"
                      placeholder="Yeni şifre"
                      minLength={12}
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
          </div>
        </section>
      </div>
    </div>
  );
}
