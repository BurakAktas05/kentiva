import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Phone, ArrowRight, ChevronRight, Loader2, KeyRound, MapPin, ShieldCheck, X } from 'lucide-react';
import { login, register, sendRegistrationOtp, AuthUser, apiBase, readFriendlyApiError } from '../../api';
import type { AuthMeta } from '../../lib/authTypes';
import { Lang, t } from '../../i18n';

interface AuthScreenProps {
  onAuth: (user: AuthUser, meta?: AuthMeta) => void;
  onContinueAsGuest?: () => void;
  lang: Lang;
  isDark?: boolean;
}

export default function AuthScreen({ onAuth, onContinueAsGuest, lang, isDark = false }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [kvkkApproved, setKvkkApproved] = useState(false);
  const [showKvkk, setShowKvkk] = useState(false);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [registrationOtpCode, setRegistrationOtpCode] = useState('');
  const [registrationOtpMessage, setRegistrationOtpMessage] = useState('');
  const [registrationOtpLoading, setRegistrationOtpLoading] = useState(false);

  // Şifre sıfırlama
  const [forgotMode, setForgotMode] = useState<'off' | 'phone' | 'otp' | 'newpass'>('off');
  const [resetPhone, setResetPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let user: AuthUser;
      if (isLogin) {
        user = await login(email, password);
        onAuth(user);
      } else {
        if (!phone.trim()) {
          setError(lang === 'tr' ? 'Telefon numarası zorunludur.' : 'Phone number is required.');
          setLoading(false);
          return;
        }
        if (registerStep === 1) {
          setRegistrationOtpLoading(true);
          try {
            const result = await sendRegistrationOtp(phone.trim());
            setRegistrationOtpMessage(
              result.devOtpCode
                ? (lang === 'tr' ? `Yerel doğrulama kodu: ${result.devOtpCode}` : `Local verification code: ${result.devOtpCode}`)
                : t('auth.otpSent', lang),
            );
            setRegisterStep(2);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('auth.error', lang));
          } finally {
            setRegistrationOtpLoading(false);
          }
        } else {
          if (registrationOtpCode.length !== 6) {
            setError(lang === 'tr' ? '6 haneli SMS doğrulama kodunu girin.' : 'Enter the 6-digit SMS verification code.');
            setLoading(false);
            return;
          }
          user = await register(
            firstName,
            lastName,
            email,
            password,
            phone,
            registrationOtpCode,
            kvkkApproved
          );
          onAuth(user, { isNewUser: true });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'Failed to fetch' || msg.includes('NetworkError')) {
        setError(
          import.meta.env.DEV
            ? (lang === 'tr'
                ? 'Sunucuya bağlanılamadı. http://localhost:3000 adresini kullanın; Ayarlar’daki API adresini temizleyin; backend’in (8080) çalıştığından emin olun.'
                : 'Cannot reach the server. Use http://localhost:3000, clear API URL in Settings, and ensure the backend (8080) is running.')
            : (lang === 'tr'
                ? 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
                : 'Could not reach the server. Check your connection and try again.'),
        );
      } else {
        setError(msg || t('auth.error', lang));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendRegistrationOtp = async () => {
    setError('');
    setRegistrationOtpMessage('');
    if (!phone.trim()) {
      setError(lang === 'tr' ? 'Önce telefon numaranızı girin.' : 'Enter your phone number first.');
      return;
    }
    setRegistrationOtpLoading(true);
    try {
      const result = await sendRegistrationOtp(phone.trim());
      setRegistrationOtpMessage(
        result.devOtpCode
          ? (lang === 'tr' ? `Yerel doğrulama kodu: ${result.devOtpCode}` : `Local verification code: ${result.devOtpCode}`)
          : t('auth.otpSent', lang),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.error', lang));
    } finally {
      setRegistrationOtpLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setResetMsg('');
    try {
      if (forgotMode === 'phone') {
        await fetch(`${apiBase()}/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          },
          body: JSON.stringify({ phoneNumber: resetPhone }),
        }).then(async r => {
          if (!r.ok) {
            throw new Error(await readFriendlyApiError(r, 'Doğrulama kodu gönderilemedi.'));
          }
        });
        setForgotMode('otp');
        setResetMsg(t('auth.otpSent', lang));
      } else if (forgotMode === 'otp') {
        setForgotMode('newpass');
      } else if (forgotMode === 'newpass') {
        await fetch(`${apiBase()}/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          },
          body: JSON.stringify({ phoneNumber: resetPhone, otpCode, newPassword }),
        }).then(async r => {
          if (!r.ok) {
            throw new Error(await readFriendlyApiError(r, 'Şifre sıfırlanamadı.'));
          }
        });
        setResetMsg(t('auth.passwordReset', lang));
        setTimeout(() => {
          setForgotMode('off');
          setResetMsg('');
        }, 2000);
      }
    } catch (err: any) {
      setResetMsg(err.message || 'Hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = isLogin
    ? (lang === 'tr' ? 'Tekrar hoş geldiniz' : lang === 'ar' ? 'مرحبًا بعودتك' : 'Welcome back')
    : (lang === 'tr' ? 'Kentiva’ya katılın' : lang === 'ar' ? 'انضم إلى Kentiva' : 'Join Kentiva');
  const pageDescription = isLogin
    ? (lang === 'tr'
        ? 'Belediye hizmetlerinize güvenli şekilde erişin.'
        : lang === 'ar'
          ? 'يمكنك الوصول إلى خدمات البلدية بأمان.'
          : 'Access your municipality services securely.')
    : (lang === 'tr'
        ? 'İhbar oluşturun ve çözüm sürecini tek yerden takip edin.'
        : lang === 'ar'
          ? 'أنشئ البلاغات وتابع عملية الحل من مكان واحد.'
          : 'Create reports and track their resolution in one place.');
  const labelClass = `mb-1.5 block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`;
  const inputClass = 'kentiva-input pl-11 pr-4';

  return (
    <div className={`relative flex min-h-app w-full flex-col items-center overflow-x-hidden px-4 py-6 pt-safe pb-safe font-sans sm:justify-center ${
      isDark ? 'bg-slate-950' : 'bg-slate-50'
    }`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className={`absolute -left-28 -top-24 h-72 w-72 rounded-full blur-3xl ${isDark ? 'bg-primary/10' : 'bg-primary/5'}`} />
        <div className={`absolute -bottom-28 -right-24 h-72 w-72 rounded-full blur-3xl ${isDark ? 'bg-amber-500/5' : 'bg-amber-100/50'}`} />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md min-w-0"
      >
        {/* Brand */}
        <div className="mb-5 flex items-center gap-3 px-1">
          <img
            src="/kentiva-app-icon.png"
            alt=""
            width={64}
            height={64}
            className={`h-16 w-16 shrink-0 rounded-[20px] border object-cover shadow-kentiva-sm ${
              isDark ? 'border-slate-700' : 'border-slate-200'
            }`}
            aria-hidden
          />
          <div className="min-w-0">
            <h1 className={`text-xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('app.name', lang)}
            </h1>
            <p className={`mt-0.5 text-xs font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('app.slogan', lang)}
            </p>
          </div>
        </div>

        <section className={`rounded-[28px] border p-5 shadow-kentiva-sm sm:p-6 ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200/90 bg-white'
        }`}>
          <div className="mb-5">
            <h2 className={`text-lg font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {pageTitle}
            </h2>
            <p className={`mt-1 text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {pageDescription}
            </p>
          </div>

        {/* Tab Switcher */}
        <div
          className={`mb-5 flex rounded-2xl p-1 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
          role="tablist"
          aria-label={lang === 'tr' ? 'Hesap işlemleri' : lang === 'ar' ? 'إجراءات الحساب' : 'Account actions'}
        >
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); setRegisterStep(1); }}
            role="tab"
            aria-selected={isLogin}
            className={`min-h-11 flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
              isLogin
                ? (isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                : (isDark ? 'text-slate-400' : 'text-slate-500')
            }`}
          >
            {t('auth.login', lang)}
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); setRegisterStep(1); }}
            role="tab"
            aria-selected={!isLogin}
            className={`min-h-11 flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
              !isLogin
                ? (isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                : (isDark ? 'text-slate-400' : 'text-slate-500')
            }`}
          >
            {t('auth.register', lang)}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            // Giriş Formu
            <>
              <div>
                <label htmlFor="auth-email" className={labelClass}>
                  {t('auth.email', lang)}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.email', lang)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-password" className={labelClass}>
                  {t('auth.password', lang)}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.password', lang)}
                    required
                    minLength={10}
                    className={inputClass}
                  />
                </div>
                <p className={`mt-1.5 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {lang === 'tr' ? 'En az 10 karakter kullanın.' : 'Use at least 10 characters.'}
                </p>
              </div>
            </>
          ) : registerStep === 1 ? (
            // Kayıt Adım 1: Kullanıcı Bilgileri
            <>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 min-w-0">
                  <label htmlFor="auth-firstname" className={labelClass}>
                    {t('auth.firstname', lang)}
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="auth-firstname"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t('auth.firstname', lang)}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <label htmlFor="auth-lastname" className={labelClass}>
                    {t('auth.lastname', lang)}
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="auth-lastname"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t('auth.lastname', lang)}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <label htmlFor="auth-phone" className={labelClass}>
                  {t('auth.phone', lang)}
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setRegistrationOtpMessage('');
                      setRegistrationOtpCode('');
                    }}
                    placeholder={t('auth.phone', lang)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-register-email" className={labelClass}>
                  {t('auth.email', lang)}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.email', lang)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-register-password" className={labelClass}>
                  {t('auth.password', lang)}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-register-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.password', lang)}
                    required
                    minLength={8}
                    className={inputClass}
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={kvkkApproved}
                  onChange={(e) => setKvkkApproved(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('auth.kvkkLabel', lang)}{' '}
                  <button type="button" onClick={(e) => { e.preventDefault(); setShowKvkk(true); }} className="text-primary font-semibold underline">{t('auth.kvkkLink', lang)}</button>
                </span>
              </label>
            </>
          ) : (
            // Kayıt Adım 2: SMS Doğrulama Kodu
            <>
              <div className="text-center py-2">
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {lang === 'tr'
                    ? `${phone} numarasına bir doğrulama kodu gönderildi.`
                    : `A verification code was sent to ${phone}.`}
                </p>
              </div>

              <div>
                <label htmlFor="auth-otp" className={labelClass}>
                  {lang === 'tr' ? 'SMS doğrulama kodu' : 'SMS verification code'}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={registrationOtpCode}
                    onChange={(e) => setRegistrationOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder={lang === 'tr' ? 'SMS doğrulama kodu' : 'SMS verification code'}
                    required
                    className={`${inputClass} text-center font-bold tracking-[0.24em]`}
                  />
                </div>
                {registrationOtpMessage && (
                  <p className="mt-2 rounded-xl bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
                    {registrationOtpMessage}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRegisterStep(1)}
                  className="kentiva-btn-secondary"
                >
                  {lang === 'tr' ? 'Geri Git' : 'Go Back'}
                </button>
                <button
                  type="button"
                  onClick={handleSendRegistrationOtp}
                  disabled={registrationOtpLoading}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {registrationOtpLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (lang === 'tr' ? 'Kodu Tekrar Gönder' : 'Resend Code')}
                </button>
              </div>
            </>
          )}

          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="kentiva-alert-error"
            >
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || (!isLogin && registerStep === 1 && (!kvkkApproved || !phone.trim())) || (!isLogin && registerStep === 2 && registrationOtpCode.length !== 6)}
            className="kentiva-btn-primary"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? t('auth.login', lang) : t('auth.register', lang)}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {isLogin && forgotMode === 'off' && (
            <button
              type="button"
              onClick={() => setForgotMode('phone')}
              className="w-full text-center text-xs font-semibold text-primary mt-2 py-2"
            >
              {t('auth.forgotPassword', lang)}
            </button>
          )}

          {onContinueAsGuest && (
            <button
              type="button"
              onClick={onContinueAsGuest}
              className={`mt-3 flex min-h-14 w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${
                isDark
                  ? 'border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-800'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isDark ? 'bg-slate-700 text-amber-300' : 'bg-white text-amber-600 shadow-sm'
              }`}>
                <MapPin className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold">
                  {lang === 'tr' ? 'Misafir olarak keşfet' : lang === 'ar' ? 'استكشف كزائر' : 'Explore as a guest'}
                </span>
                <span className={`mt-0.5 block text-[11px] font-medium leading-relaxed ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {lang === 'tr'
                    ? 'Belediyenizi seçin, duyuru ve hizmetleri görüntüleyin.'
                    : lang === 'ar'
                      ? 'اختر بلديتك واعرض الإعلانات والخدمات.'
                      : 'Choose your municipality and view announcements and services.'}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </button>
          )}
        </form>

        {/* Şifre Sıfırlama Modal */}
        <AnimatePresence>
          {forgotMode !== 'off' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`mt-5 space-y-4 rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}
            >
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-sm font-bold">{t('auth.resetTitle', lang)}</h3>
              </div>

              {forgotMode === 'phone' && (
                <div className="space-y-3">
                  <label htmlFor="auth-reset-phone" className="block text-xs text-slate-500">
                    {t('auth.resetPhoneDesc', lang)}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="auth-reset-phone"
                      type="tel"
                      value={resetPhone}
                      onChange={(e) => setResetPhone(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {forgotMode === 'otp' && (
                <div className="space-y-3">
                  <label htmlFor="auth-reset-otp" className="block text-xs text-slate-500">
                    {t('auth.otpDesc', lang)}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="auth-reset-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6 haneli kod"
                      className={`${inputClass} text-center font-bold tracking-[0.3em]`}
                    />
                  </div>
                </div>
              )}

              {forgotMode === 'newpass' && (
                <div className="space-y-3">
                  <label htmlFor="auth-reset-newpass" className="block text-xs text-slate-500">
                    {t('auth.newPassDesc', lang)}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="auth-reset-newpass"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('auth.newPassword', lang)}
                      minLength={10}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {resetMsg && (
                <p className="text-xs font-semibold text-primary bg-primary/5 rounded-xl px-3 py-2">{resetMsg}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setForgotMode('off'); setResetMsg(''); }}
                  className="kentiva-btn-secondary"
                >
                  {t('auth.cancel', lang)}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleForgotPassword}
                  className="flex-1 rounded-xl bg-primary py-3 text-xs font-bold text-white shadow-sm disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> :
                    forgotMode === 'phone' ? t('auth.sendOtp', lang) :
                    forgotMode === 'otp' ? t('auth.verifyOtp', lang) :
                    t('auth.setNewPassword', lang)
                  }
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </section>
        <p className={`px-5 pt-4 text-center text-[10px] font-medium leading-relaxed ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}>
          {lang === 'tr'
            ? 'Devam ederek Kentiva’nın güvenli kullanım koşullarını kabul etmiş olursunuz.'
            : lang === 'ar'
              ? 'بالمتابعة، فإنك توافق على شروط الاستخدام الآمن لـ Kentiva.'
              : 'By continuing, you agree to Kentiva’s secure use terms.'}
        </p>
      </motion.div>

      {/* KVKK Modal */}
      <AnimatePresence>
        {showKvkk && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
            onClick={() => setShowKvkk(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md max-h-[80vh] rounded-2xl border p-6 shadow-xl overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">{t('auth.kvkkLink', lang)}</h3>
                <button
                  type="button"
                  onClick={() => setShowKvkk(false)}
                  aria-label={lang === 'tr' ? 'Aydınlatma metnini kapat' : lang === 'ar' ? 'إغلاق النص' : 'Close privacy notice'}
                  className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className={`text-xs leading-relaxed space-y-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <p className="font-bold text-sm">{lang === 'tr' ? '6698 Sayılı Kişisel Verilerin Korunması Kanunu (KVKK) Aydınlatma Metni' : 'Personal Data Protection Policy (KVKK)'}</p>
                <p>{lang === 'tr' ? 'Kentiva Yazılım Teknolojileri olarak kişisel verilerinizin güvenliği konusuna azami hassasiyet göstermekteyiz. Bu doğrultuda, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca kişisel verileriniz aşağıda açıklandığı şekilde işlenmektedir.' : 'As Kentiva Software Technologies, we attach the utmost importance to the security of your personal data. Accordingly, your personal data is processed as described below in accordance with the Personal Data Protection Law No. 6698 ("KVKK").'}</p>
                <p className="font-semibold">{lang === 'tr' ? '1. Veri Sorumlusu' : '1. Data Controller'}</p>
                <p>{lang === 'tr' ? 'Kişisel verileriniz, veri sorumlusu sıfatıyla Kentiva Yazılım Teknolojileri tarafından toplanmakta ve işlenmektedir.' : 'Your personal data is collected and processed by Kentiva Software Technologies as the data controller.'}</p>
                <p className="font-semibold">{lang === 'tr' ? '2. İşlenen Kişisel Veriler ve Amaçları' : '2. Personal Data Processed and Purposes'}</p>
                <p>{lang === 'tr' ? 'Ad-soyad, e-posta, telefon numarası, konum verileri ve fotoğraflar; ihbar oluşturma, kimlik doğrulama, belediye hizmet iyileştirme ve iletişim amaçlarıyla işlenmektedir. Fotoğraflar yalnızca ihbar doğrulama amacıyla kullanılır.' : 'Name, email, phone number, location data and photos are processed for report creation, authentication, municipal service improvement and communication purposes. Photos are used only for report verification purposes.'}</p>
                <p className="font-semibold">{lang === 'tr' ? '3. Verilerin Aktarımı' : '3. Data Transfer'}</p>
                <p>{lang === 'tr' ? 'Kişisel verileriniz, yalnızca hizmet aldığınız belediye ile ve yasal zorunluluklar çerçevesinde yetkili kurumlarla paylaşılabilir. Üçüncü şahıslarla ticari amaçlı paylaşım yapılmaz.' : 'Your personal data may only be shared with the municipality you receive service from and with authorized institutions within the framework of legal obligations. No commercial sharing with third parties is made.'}</p>
                <p className="font-semibold">{lang === 'tr' ? '4. Haklarınız' : '4. Your Rights'}</p>
                <p>{lang === 'tr' ? 'KVKK\'nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini, silinmesini veya anonim hale getirilmesini isteme haklarına sahipsiniz. Başvurularınızı uygulama içi geri bildirim bölümünden veya kvkk@kentiva.app adresinden iletebilirsiniz.' : 'In accordance with Article 11 of KVKK; you have the right to learn whether your personal data is processed, to request correction, deletion or anonymization. You can submit your applications through the in-app feedback section or at kvkk@kentiva.app.'}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowKvkk(false)}
                className="mt-5 w-full rounded-xl bg-primary py-3 text-xs font-bold text-white shadow-sm hover:brightness-105 active:scale-[0.98] transition-all"
              >
                {lang === 'tr' ? 'Anladım, Kapat' : 'Got it, Close'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
