# Kentiva — Yayınlama ve operasyon

## Sıralı yayın yolu

```
1. ANAHTARLAR.template.env  →  ANAHTARLAR.local.env doldur (commit etme)
2. STORAGE.md               →  S3 uyumlu medya bucket
3. MEDIA-GUARD.md           →  private Media Guard
4. YAYINLAMA.md             →  Servis seçimi + adımlar + maliyet tahmini
5. PROD-CHECKLIST.md        →  Kapıları kapat
6. ROLLBACK.md              →  Geri dönüş
7. STORE-LISTELEME.md       →  Mağaza (mobil)
```

## Belgeler

| Belge | Ne zaman |
|-------|----------|
| [`YAYINLAMA.md`](YAYINLAMA.md) | Servis matrisi, maliyet, adım adım |
| [`ANAHTARLAR.template.env`](ANAHTARLAR.template.env) | Secret şablonu |
| [`STORAGE.md`](STORAGE.md) | R2 / S3 / B2 / Spaces |
| [`MEDIA-GUARD.md`](MEDIA-GUARD.md) | Medya koruma |
| [`PROD-CHECKLIST.md`](PROD-CHECKLIST.md) | Go-live |
| [`ROLLBACK.md`](ROLLBACK.md) | Rollback |
| [`STORE-LISTELEME.md`](STORE-LISTELEME.md) | Play / App Store |

## Mantıksal topoloji

| Bileşen | Örnek host (zorunlu değil) |
|---------|----------------------------|
| API + DB + Redis + RabbitMQ | Railway, Render, Cloud Run, … |
| Media Guard | Aynı platform private |
| Medya | S3 / R2 / B2 / Spaces |
| Frontends | Vercel, Netlify, Pages, … |
| DNS | Herhangi registrar + platform SSL |

Docker Compose **yalnızca yerel**. [`../DOCKER.md`](../DOCKER.md)

## Canlıya çıkış (özet)

- `SPRING_PROFILES_ACTIVE=prod`
- HTTPS `APP_PUBLIC_URL` + `APP_PUBLIC_SITE_URL` + CORS
- S3 + Redis + RabbitMQ + NetGSM + Gemini + `MEDIA_GUARD_URL`
- Fail-closed medya
- Smoke + rollback planı

Tam liste: [`PROD-CHECKLIST.md`](PROD-CHECKLIST.md)
