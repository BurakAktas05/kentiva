/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API kökü (admin-portal ile aynı: …/api/v1) */
  readonly VITE_API_BASE?: string;
  /** @deprecated VITE_API_BASE kullanın */
  readonly VITE_PUBLIC_API_BASE?: string;
  /** Kamu sitesi kök URL (canonical / Open Graph için) */
  readonly VITE_SITE_URL?: string;
  /** Belediyeler için subdomain kök alanı */
  readonly VITE_PUBLIC_SITE_ROOT_DOMAIN?: string;
  /** Ayrılmış alt alan adları */
  readonly VITE_RESERVED_SUBDOMAINS?: string;
  /** Yönetim portalı giriş adresi */
  readonly VITE_ADMIN_PORTAL_URL?: string;
  /** Belediye paneli / kurum giris adresi */
  readonly VITE_MUNICIPALITY_PORTAL_URL?: string;
  /** Platform super admin dogrudan giris adresi */
  readonly VITE_SUPER_ADMIN_PORTAL_URL?: string;
  /** Vatandaş uygulaması / PWA adresi */
  readonly VITE_CITIZEN_APP_URL?: string;
  /** Demo talep e-postası */
  readonly VITE_DEMO_EMAIL?: string;
  /** Public fiyat etiketi (Profesyonel), ör. ₺9.999 */
  readonly VITE_MONTHLY_PRICE_LABEL?: string;
  /** Başlangıç plan fiyatı */
  readonly VITE_STARTER_PRICE_LABEL?: string;
  /** Enterprise fiyat etiketi */
  readonly VITE_ENTERPRISE_PRICE_LABEL?: string;
  /** Pilot süresi etiketi, ör. 90 gün */
  readonly VITE_PILOT_DURATION_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
