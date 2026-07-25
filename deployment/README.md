# Kentiva — Yayınlama ve operasyon

Canlı / staging geçişinde izlenecek belgeler. Satış ve sözleşme metinleri için [`../sales-package/`](../sales-package/README.md).

## Sıralı yayın yolu

```
1. ANAHTARLAR.template.env  →  ANAHTARLAR.local.env doldur (commit etme)
2. MEDIA-GUARD.md           →  Media Guard’ı private deploy et
3. YAYINLAMA.md             →  Railway + Vercel + APK
4. PROD-CHECKLIST.md        →  Kapıları tek tek kapat
5. Staging E2E + load-test  →  e2e/ ve scripts/load-test/
6. ROLLBACK.md              →  Geri dönüş planını ekiple doğrula
7. STORE-LISTELEME.md       →  Mağaza metinleri (mobil yayın)
```

## Belgeler

| Belge | Ne zaman |
|-------|----------|
| [`YAYINLAMA.md`](YAYINLAMA.md) | Railway, Vercel, APK adım adım |
| [`ANAHTARLAR.template.env`](ANAHTARLAR.template.env) | Tüm ortam değişkenleri şablonu |
| [`MEDIA-GUARD.md`](MEDIA-GUARD.md) | Medya koruma servisi (prod zorunlu) |
| [`PROD-CHECKLIST.md`](PROD-CHECKLIST.md) | Canlıya çıkış kontrol listesi |
| [`ROLLBACK.md`](ROLLBACK.md) | Sürüm geri alma ve olay müdahalesi |
| [`STORE-LISTELEME.md`](STORE-LISTELEME.md) | Play / App Store metinleri |
| [`PROD-ANALIZ-RAPORU.md`](PROD-ANALIZ-RAPORU.md) | Yayın öncesi durum özeti |

## Hedef topoloji

| Bileşen | Host |
|---------|------|
| API + PostgreSQL + Redis + RabbitMQ | Railway (veya eşdeğer) |
| Media Guard | Railway private service / iç ağ |
| Admin portal | Vercel (`admin-portal`) |
| Public site | Vercel (`public-site`) |
| Vatandaş web (opsiyonel) | Vercel (`belediyehattı`) |
| Android / iOS | İmzalı yerel veya CI derleme |

Docker Compose **yalnızca yerel geliştirme** içindir — üretim için kullanmayın. Bkz. [`../DOCKER.md`](../DOCKER.md).

## Canlıya çıkış kriteri (özet)

- `SPRING_PROFILES_ACTIVE=prod`
- HTTPS `APP_PUBLIC_URL` + CORS origin’leri
- S3/R2 + Redis + RabbitMQ + NetGSM + Gemini + `MEDIA_GUARD_URL`
- Fail-closed medya bayrakları
- Staging’de kritik E2E ve tenant izolasyon smoke
- Yedek + en az bir restore tatbikatı
- Uptime / readiness / kuyruk alarmı
- Yazılı rollback planı ([`ROLLBACK.md`](ROLLBACK.md))

Tam liste: [`PROD-CHECKLIST.md`](PROD-CHECKLIST.md)
