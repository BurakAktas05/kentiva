import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Building2, Menu, X } from 'lucide-react';

const ADMIN_PORTAL_URL =
  (import.meta.env.VITE_ADMIN_PORTAL_URL as string | undefined)?.trim() ||
  'https://admin.kentiva.app';

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25 ring-1 ring-white/20 ${className}`}
      aria-hidden
    >
      <Building2 className="h-5 w-5" strokeWidth={2} />
    </div>
  );
}

export default function SiteLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-lg focus:ring-2 focus:ring-primary focus:outline-none"
      >
        İçeriğe geç
      </a>

      <header className="sticky top-0 z-50">
        <nav
          className="border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md"
          aria-label="Ana gezinme"
        >
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 sm:h-[4.25rem]">
            <Link
              to="/"
              className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <BrandMark />
              <div className="min-w-0">
                <span className="block truncate text-base font-bold tracking-tight text-slate-900">
                  Kentiva
                </span>
                <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:block">
                  Belediye operasyon platformu
                </span>
              </div>
            </Link>
            <div className="hidden items-center gap-10 md:flex">
              <a
                href="/#ozellikler"
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary"
              >
                Özellikler
              </a>
              <a
                href="/#istatistikler"
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary"
              >
                İstatistikler
              </a>
              <a
                href="/#kilavuz"
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary"
              >
                Kullanım kılavuzu
              </a>
              <a
                href="/#fiyatlandirma"
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary"
              >
                Fiyatlandırma
              </a>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <a
                href={`${ADMIN_PORTAL_URL}`}
                target="_blank"
                rel="noreferrer"
                className="hidden text-sm font-semibold text-slate-600 transition-colors hover:text-primary sm:inline"
              >
                Yönetici Paneli
              </a>
              <a
                href="mailto:demo@kentiva.app?subject=Kentiva%20Demo%20Talebi"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-4"
              >
                Demo Talep Et
              </a>
              
              {/* Hamburger Button for mobile */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none md:hidden transition-colors"
                aria-label="Menüyü aç/kapat"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-lg transition-all duration-200">
            <div className="space-y-1 px-4 py-3">
              <a
                href="/#ozellikler"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
              >
                Özellikler
              </a>
              <a
                href="/#istatistikler"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
              >
                İstatistikler
              </a>
              <a
                href="/#kilavuz"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
              >
                Kullanım kılavuzu
              </a>
              <a
                href="/#fiyatlandirma"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
              >
                Fiyatlandırma
              </a>
              <div className="h-px bg-slate-100 my-2" />
              <a
                href={`${ADMIN_PORTAL_URL}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
              >
                Yönetici Paneli
              </a>
            </div>
          </div>
        )}
      </header>

      <Outlet />

      <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <BrandMark />
                <span className="text-sm font-bold tracking-tight text-white">Kentiva</span>
              </div>
              <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-slate-400">
                © {new Date().getFullYear()} Kentiva Yazılım Teknolojileri. Tüm hakları saklıdır.
              </p>
            </div>
            <nav className="flex flex-col gap-2 text-sm font-semibold sm:items-end" aria-label="Alt bağlantılar">
              <a href="/#ozellikler" className="text-slate-400 transition-colors hover:text-white">
                Özellikler
              </a>
              <a href="/#istatistikler" className="text-slate-400 transition-colors hover:text-white">
                İstatistikler
              </a>
              <a href="/#kilavuz" className="text-slate-400 transition-colors hover:text-white">
                Kullanım kılavuzu
              </a>
              <a href="/#fiyatlandirma" className="text-slate-400 transition-colors hover:text-white">
                Fiyatlandırma
              </a>
              <a
                href={`${ADMIN_PORTAL_URL}/super-admin/login`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 transition-colors hover:text-white"
              >
                Platform Süper Yönetici Girişi
              </a>
              <Link to="/gizlilik-politikasi" className="text-slate-400 transition-colors hover:text-white">
                Gizlilik Politikası
              </Link>
              <Link to="/kullanim-kosullari" className="text-slate-400 transition-colors hover:text-white">
                Kullanım Koşulları
              </Link>
              <a href="mailto:demo@kentiva.app" className="text-slate-400 transition-colors hover:text-white">
                demo@kentiva.app
              </a>
            </nav>
          </div>
          <p className="mt-8 border-t border-slate-800/80 pt-6 text-xs font-medium leading-relaxed text-slate-500">
            KVKK: Bu sayfadaki istatistikler anonimleştirilmiş toplu verilerden oluşur; tekil bildirim,
            konum veya kimlik bilgisi kamuya açık paylaşılmaz.
          </p>
        </div>
      </footer>
    </div>
  );
}
