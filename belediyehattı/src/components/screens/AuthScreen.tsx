import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Phone, ArrowRight, Building2, Loader2, KeyRound, ShieldCheck } from 'lucide-react';
import { login, register, AuthUser, apiBase } from '../../api';
import { Lang, t } from '../../i18n';

interface AuthScreenProps {
  onAuth: (user: AuthUser) => void;
  lang: Lang;
}

export default function AuthScreen({ onAuth, lang }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      } else {
        user = await register(firstName, lastName, email, password, phone || undefined);
      }
      onAuth(user);
    } catch (err: any) {
      setError(err.message || t('auth.error', lang));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setResetMsg('');
    try {
      if (forgotMode === 'phone') {
        await fetch(`${apiBase()}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: resetPhone }),
        }).then(async r => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.message || 'Hata');
        });
        setForgotMode('otp');
        setResetMsg(t('auth.otpSent', lang));
      } else if (forgotMode === 'otp') {
        setForgotMode('newpass');
      } else if (forgotMode === 'newpass') {
        await fetch(`${apiBase()}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: resetPhone, otpCode, newPassword }),
        }).then(async r => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.message || 'Hata');
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 p-6 pt-safe pb-safe font-sans [background-image:radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,233,0.12),transparent)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Brand */}
        <div className="text-center mb-10">
          <div
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white/90 bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/30 ring-1 ring-slate-900/5"
            aria-hidden
          >
            <Building2 className="h-10 w-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t('app.name', lang)}</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">{t('app.slogan', lang)}</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/60 rounded-2xl p-1.5 mb-8">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              isLogin ? 'bg-white text-primary shadow-md shadow-slate-300/50' : 'text-slate-500'
            }`}
          >
            {t('auth.login', lang)}
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              !isLogin ? 'bg-white text-primary shadow-md shadow-slate-300/50' : 'text-slate-500'
            }`}
          >
            {t('auth.register', lang)}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                key="register-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t('auth.firstname', lang)}
                      required={!isLogin}
                      className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t('auth.lastname', lang)}
                      required={!isLogin}
                      className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm"
                    />
                  </div>
                </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('auth.phone', lang)}
                      required={!isLogin}
                      className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm"
                    />
                  </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email', lang)}
              required
              className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm"
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
              className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm"
            />
          </div>

          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold p-4 rounded-2xl flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
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
        </form>

        {/* Şifre Sıfırlama Modal */}
        <AnimatePresence>
          {forgotMode !== 'off' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-md space-y-4"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary outline-none"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm tracking-[0.3em] text-center font-bold focus:ring-2 focus:ring-primary outline-none"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary outline-none"
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
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600"
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
    </div>
  );
}
