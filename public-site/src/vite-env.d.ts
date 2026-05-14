/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_API_BASE?: string;
  /** Yönetim portalı giriş adresi (örn. https://admin.kentiva.app) */
  readonly VITE_ADMIN_PORTAL_URL?: string;
  /** Vatandaş uygulaması / PWA adresi (kılavuzda “Uygulamayı aç” bağlantısı) */
  readonly VITE_CITIZEN_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
