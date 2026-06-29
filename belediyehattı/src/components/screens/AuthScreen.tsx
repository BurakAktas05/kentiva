import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Phone, ArrowRight, Building2, Loader2, KeyRound, ShieldCheck, X } from 'lucide-react';
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
          lang === 'tr'
            ? 'Sunucuya bağlanılamadı. http://localhost:3000 adresini kullanın; Ayarlar’daki API adresini temizleyin; backend’in (8080) çalıştığından emin olun.'
            : 'Cannot reach the server. Use http://localhost:3000, clear API URL in Settings, and ensure the backend (8080) is running.',
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

  return (
    <div className={`min-h-app w-full overflow-x-hidden flex flex-col items-center justify-center px-4 py-6 pt-safe pb-safe font-sans ${isDark ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 [background-image:radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,233,0.08),transparent)]' : 'bg-gradient-to-b from-slate-50 via-white to-slate-100 [background-image:radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,233,0.12),transparent)]'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md min-w-0"
      >
        {/* Brand */}
        <div className="text-center mb-10">
          <div
            className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-4 bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/30 ring-1 ${isDark ? 'border-slate-800/90 ring-white/10' : 'border-white/90 ring-slate-900/5'}`}
            aria-hidden
          >
            <Building2 className="h-10 w-10" strokeWidth={1.5} />
          </div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>{t('app.name', lang)}</h1>
          <p className={`text-sm mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('app.slogan', lang)}</p>
        </div>

        {/* Tab Switcher */}
        <div className={`flex rounded-2xl p-1.5 mb-8 ${isDark ? 'bg-slate-800/60' : 'bg-slate-200/60'}`}>
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); setRegisterStep(1); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              isLogin ? (isDark ? 'bg-slate-900 text-secondary shadow-md shadow-slate-950/50' : 'bg-white text-primary shadow-md shadow-slate-300/50') : (isDark ? 'text-slate-400' : 'text-slate-500')
            }`}
          >
            {t('auth.login', lang)}
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); setRegisterStep(1); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              !isLogin ? (isDark ? 'bg-slate-900 text-secondary shadow-md shadow-slate-950/50' : 'bg-white text-primary shadow-md shadow-slate-300/50') : (isDark ? 'text-slate-400' : 'text-slate-500')
            }`}
          >
            {t('auth.register', lang)}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            // Giriş Formu
            <>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.email', lang)}
                  required
                  className={`w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm ${isDark ? 'bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border border-slate-200 text-slate-900'}`}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.password', lang)}
                  required
                  minLength={8}
                  className={`w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm ${isDark ? 'bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border border-slate-200 text-slate-900'}`}
                />
              </div>
            </>
          ) : registerStep === 1 ? (
            // Kayıt Adım 1: Kullanıcı Bilgileri
            <>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 relative min-w-0">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('auth.firstname', lang)}
                    required
                    className={`w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm ${isDark ? 'bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div className="flex-1 relative min-w-0">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('auth.lastname', lang)}
                    required
                    className={`w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm ${isDark ? 'bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="relative min-w-0">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setRegistrationOtpMessage('');
                    setRegistrationOtpCode('');
                  }}
                  placeholder={t('auth.phone', lang)}
                  required
                  className={`w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm ${isDark ? 'bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border border-slate-200 text-slate-900'}`}
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.email', lang)}
                  required
                  className={`w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm ${isDark ? 'bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border border-slate-200 text-slate-900'}`}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.password', lang)}
                  required
                  minLength={8}
                  className={`w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm ${isDark ? 'bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border border-slate-200 text-slate-900'}`}
                />
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

              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={registrationOtpCode}
                  onChange={(e) => setRegistrationOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={lang === 'tr' ? 'SMS doğrulama kodu' : 'SMS verification code'}
                  required
                  className={`w-full rounded-2xl pl-11 pr-4 py-3.5 text-center text-sm font-bold tracking-[0.24em] focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm ${isDark ? 'bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border border-slate-200 text-slate-900'}`}
                />
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
              className={`w-full text-center text-xs font-bold py-3.5 border border-dashed rounded-2xl transition-all cursor-pointer mt-2 ${
                isDark 
                  ? 'border-slate-700 text-slate-400 hover:text-sky-400 hover:border-sky-400/50' 
                  : 'border-slate-300 text-slate-500 hover:text-primary hover:border-primary/50'
              }`}
            >
              {lang === 'tr' ? 'Giriş Yapmadan Devam Et (Misafir)' : 'Continue without Logging In (Guest)'}
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
              className={`mt-6 rounded-2xl border p-5 shadow-md space-y-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-sm font-bold">{t('auth.resetTitle', lang)}</h3>
              </div>

              {forgotMode === 'phone' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">{t('auth.resetPhoneDesc', lang)}</p>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={resetPhone}
                      onChange={(e) => setResetPhone(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      className={`w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary outline-none ${isDark ? 'bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border border-slate-200'}`}
                    />
                  </div>
                </div>
              )}

              {forgotMode === 'otp' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">{t('auth.otpDesc', lang)}</p>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6 haneli kod"
                      className={`w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm tracking-[0.3em] text-center font-bold focus:ring-2 focus:ring-primary outline-none ${isDark ? 'bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border border-slate-200'}`}
                    />
                  </div>
                </div>
              )}

              {forgotMode === 'newpass' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">{t('auth.newPassDesc', lang)}</p>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('auth.newPassword', lang)}
                      minLength={8}
                      className={`w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary outline-none ${isDark ? 'bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border border-slate-200'}`}
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
                <button type="button" onClick={() => setShowKvkk(false)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
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
