/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API kökü (admin-portal ile aynı: …/api/v1) */
  readonly VITE_API_BASE?: string;
  /** @deprecated VITE_API_BASE kullanın */
  readonly VITE_PUBLIC_API_BASE?: string;
  /** Kamu sitesi kök URL (canonical / Open Graph için) */
  readonly VITE_SITE_URL?: string;
  /** Yönetim portalı giriş adresi */
  readonly VITE_ADMIN_PORTAL_URL?: string;
  /** Vatandaş uygulaması / PWA adresi */
  readonly VITE_CITIZEN_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
