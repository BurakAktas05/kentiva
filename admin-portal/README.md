# Kentiva — Yönetim paneli

Belediye operasyon konsolu ve platform süper admin arayüzü.

**Canlı yayın:** [`../deployment/YAYINLAMA.md`](../deployment/YAYINLAMA.md)

## Geliştirme

```bash
cp .env.example .env
npm install
npm run dev
```

Varsayılan: http://localhost:5173

| Değişken | Zorunlu (prod) | Açıklama |
|----------|----------------|----------|
| `VITE_API_BASE` | Evet | `https://<api>/api/v1` |
| `VITE_ADMIN_PORTAL_BASE_URL` | Önerilir | Portal kanonik URL |
| `VITE_PUBLIC_SITE_BASE` | Opsiyonel | Önizleme / bağlantılar |
| `VITE_MUNICIPALITY_PORTAL_ROOT_DOMAIN` | Opsiyonel | Wildcard tenant panelleri |

## Komutlar

```bash
npm run lint
npm run test
npm run build
```

## Giriş yolları

| Rol | Yol |
|-----|-----|
| İlk kurulum | `/setup` (`APP_SETUP_TOKEN`) |
| Platform sahibi | `/super-admin/login` |
| Belediye personeli | `/login` → çalışma alanı |

Production’da localhost API fallback yoktur; `VITE_API_BASE` tanımlı olmalıdır.
