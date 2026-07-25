# Kentiva — Kurumsal / kamu sitesi

Satış sayfası, belediye slug sayfaları ve canlı istatistikler.

**Canlı yayın:** [`../deployment/YAYINLAMA.md`](../deployment/YAYINLAMA.md) §5

## Geliştirme

```bash
cp .env.example .env
npm install
npm run dev
```

Varsayılan: http://localhost:5174

| Değişken | Zorunlu (prod) |
|----------|----------------|
| `VITE_API_BASE` | Evet |
| `VITE_SITE_URL` | Önerilir |
| `VITE_ADMIN_PORTAL_URL` | Önerilir |
| `VITE_CITIZEN_APP_URL` | Önerilir |

## Komutlar

```bash
npm run lint
npm run test
npm run build
```
