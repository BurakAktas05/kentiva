import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { inferMunicipalitySlugFromHostname, publicSiteRootDomain } from '../lib/tenantDomains';
import {
  ArrowRight,
  Building2,
  LockKeyhole,
  Shield,
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
    const slugFromHost = inferMunicipalitySlugFromHostname(window.location.hostname);
    if (slugFromHost && user.municipality.slug !== slugFromHost) {
      return `Bu hesap bu çalışma alanına (${slugFromHost}) ait değil.`;
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
    const slugFromHost = inferMunicipalitySlugFromHostname(window.location.hostname);
    if (slugFromHost && user.municipality.slug !== slugFromHost) {
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
    const rootDomain = publicSiteRootDomain() || 'localhost';
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    let targetUrl = '';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      targetUrl = `${protocol}//${cleanSlug}.localhost${port}/municipality/login`;
    } else {
      targetUrl = `${protocol}//${cleanSlug}.${rootDomain}${port}/municipality/login`;
    }
    window.location.href = targetUrl;
  };

  const quickLinks = [
    { name: 'Gümüşhacıköy Belediyesi', slug: 'gumushacikoy' },
    { name: 'Safranbolu Belediyesi', slug: 'safranbolu' },
    { name: 'Amasya Belediyesi', slug: 'amasya' },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(135deg,#e2ecf8_0%,#f8fafc_46%,#d7e5f7_100%)] px-6 py-10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(135deg,#020617_0%,#0f172a_48%,#111827_100%)] flex flex-col justify-between">
      <div className="mx-auto flex flex-1 flex-col justify-center items-center max-w-xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/25 mb-4">
            <Building2 className="h-8 w-8" />
          </div>
          <p className="kentiva-eyebrow justify-center">Kentiva Portal Girişi</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">
            Belediye Çalışma Alanınıza Girin
          </h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 text-center">
            Belediyenize özel yönetim portalına erişmek için çalışma alanı adını (slug) girin.
          </p>
        </div>

        <div className="w-full rounded-[2.5rem] border border-white/70 bg-white/90 p-8 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.28)] dark:border-slate-700/80 dark:bg-slate-900/88">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="kentiva-label">Çalışma Alanı Adresi</label>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-4 text-slate-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <input
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
                <div className="absolute right-4 text-sm font-bold text-slate-400 select-none">
                  .kentiva.com.tr
                </div>
              </div>
              {error && <p className="text-xs font-bold text-rose-500 mt-1">{error}</p>}
            </div>

            <button type="submit" className="kentiva-btn-primary w-full !rounded-2xl !py-4 flex items-center justify-center gap-2 text-base font-bold shadow-lg shadow-primary/20">
              Çalışma Alanına Git
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200/60 pt-6 dark:border-slate-800">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Hızlı Erişim (Test)</p>
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
          </div>
        </div>
      </div>

      <div className="text-center py-4">
        <Link to="/super-admin/login" className="text-xs font-bold text-slate-400 hover:text-primary transition dark:text-slate-500 dark:hover:text-primary">
          Sistem Yönetim Geçidi (Süper Admin)
        </Link>
      </div>
    </div>
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

  // 2-Step SMS states
  const [loginStep, setLoginStep] = useState<'credentials' | 'sms'>('credentials');
  const [tempAuthData, setTempAuthData] = useState<any>(null);
  const [smsCode, setSmsCode] = useState('');
  const [smsError, setSmsError] = useState('');

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

      setTempAuthData(res.data.data);
      setLoginStep('sms');
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

  const handleSmsVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!smsCode || smsCode.length < 6) {
      setSmsError('Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }
    if (smsCode === '123456' || smsCode === '000000') {
      completeLogin();
    } else {
      setSmsError('Girdiğiniz kod hatalı. (Test için 123456 veya 000000 kullanabilirsiniz)');
    }
  };

  const completeLogin = () => {
    if (!tempAuthData) return;
    setStoredAuthTokens(tempAuthData.accessToken, tempAuthData.refreshToken ?? null);
    savePreferredLoginPortal(portal);
    onLogin(buildPortalUser(tempAuthData));
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
              loginStep === 'credentials' ? (
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
                <form onSubmit={handleSmsVerify} className="space-y-6">
                  <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                      <LockKeyhole className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-black text-slate-950 dark:text-white">SMS Kodu Doğrulama</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Girişi tamamlamak için telefonunuza gönderilen 6 haneli doğrulama kodunu girin.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={smsCode}
                      onChange={(e) => {
                        setSmsCode(e.target.value.replace(/\D/g, ''));
                        setSmsError('');
                      }}
                      className="kentiva-input !rounded-2xl !py-4 text-center text-3xl font-black tracking-[0.3em] pl-[0.3em] text-slate-800 dark:text-white"
                      placeholder="000000"
                      required
                    />
                    <p className="text-[11px] text-center font-bold text-slate-400">
                      Test için kod: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-primary">123456</code> veya <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-primary">000000</code>
                    </p>
                    {smsError && <p className="kentiva-alert-error !rounded-2xl text-center">{smsError}</p>}
                  </div>

                  <div className="space-y-2.5">
                    <button type="submit" className="kentiva-btn-primary w-full !rounded-2xl !py-4 font-bold shadow-lg shadow-primary/20">
                      Kodu Doğrula ve Giriş Yap
                    </button>
                    <button
                      type="button"
                      onClick={completeLogin}
                      className="kentiva-btn-secondary w-full !rounded-2xl !py-4 font-bold border-dashed border-2 hover:border-primary hover:text-primary transition"
                    >
                      Doğrulamayı Atla (Test)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginStep('credentials')}
                      className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                    >
                      E-posta/Şifre Ekranına Geri Dön
                    </button>
                  </div>
                </form>
              )
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
          </div>
        </section>
      </div>
    </div>
  );
}
