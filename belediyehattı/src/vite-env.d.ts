/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_TENANT_ROOT_DOMAIN?: string;
  readonly VITE_PUBLIC_SITE_ROOT_DOMAIN?: string;
  readonly VITE_RESERVED_SUBDOMAINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
