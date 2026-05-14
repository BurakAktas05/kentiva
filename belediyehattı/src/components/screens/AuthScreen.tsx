import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Phone, ArrowRight, Building2, Loader2 } from 'lucide-react';
import { login, register, AuthUser } from '../../api';
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
      setError(err.message || 'Bir hata oluştu');
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
        </form>
      </motion.div>
    </div>
  );
}
