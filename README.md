# Kentiva — Akıllı Kent ve Belediye Yönetim Platformu

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-brightgreen.svg?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-blue.svg?style=flat-square&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-blue.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org)

Kentiva; belediye operasyonlarını modernize etmek, vatandaş ihbar süreçlerini hızlandırmak ve yöneticilere ölçülebilir görünürlük sunmak üzere tasarlanmış **çok kiracılı B2B SaaS** platformudur.

---

## Uygulamalar

| Uygulama | Klasör | Rol |
|----------|--------|-----|
| Backend API | `backend/` | Java 21 · Spring Boot · PostgreSQL / PostGIS / pgvector |
| Yönetim paneli | `admin-portal/` | Belediye operasyon konsolu |
| Vatandaş uygulaması | `belediyehattı/` | Capacitor mobil |
| Kurumsal site | `public-site/` | Satış / bilgilendirme |
| Medya koruma | `services/media-guard/` | KVKK anonimleştirme |

---

## Satış ve sunum

Satış ve sunum için tek paket: **[`sales-package/`](sales-package/README.md)**

| Hızlı aç | Dosya |
|----------|--------|
| HTML sunum (F11) | [`sales-package/01-pitch/sunum.html`](sales-package/01-pitch/sunum.html) |
| One-pager | [`sales-package/01-pitch/one-pager-tr.md`](sales-package/01-pitch/one-pager-tr.md) |
| Fiyat politikası | [`sales-package/02-commercial/FIYAT-POLITIKASI.md`](sales-package/02-commercial/FIYAT-POLITIKASI.md) |
| Tanıtım + kullanım videosu | [`sales-package/05-media/oynatici.html`](sales-package/05-media/oynatici.html) |

Belediye görüşmeleri için tek paket:

- **[`sales-package/`](sales-package/README.md)** — one-pager, HTML sunum, fiyat politikası, teklif şablonu, KVKK/güvenlik, video senaryoları
- Sunum: `sales-package/01-pitch/sunum.html` (tarayıcıda açın)
- Fiyat kaynağı: `sales-package/02-commercial/FIYAT-POLITIKASI.md`
  - Başlangıç **₺4.990/ay** · Profesyonel **₺9.999/ay** · Enterprise teklif · **90 gün ücretsiz pilot**

Marka ve video varlıkları: [`marketing-assets/kentiva/`](marketing-assets/kentiva/README.md)

---

## Geliştirme

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```

Detay: [`DOCKER.md`](DOCKER.md)

Yerel backend:

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Dev süper admin: `admin@kentiva.app` / `admin123` (yalnızca `dev` profili)

Swagger: http://localhost:8080/swagger-ui/index.html

---

## Operasyon belgeleri

| Belge | Konum |
|-------|--------|
| Yayınlama / APK | [`deployment/YAYINLAMA.md`](deployment/YAYINLAMA.md) |
| Prod kontrol listesi | [`deployment/PROD-CHECKLIST.md`](deployment/PROD-CHECKLIST.md) |
| Demo senaryosu | [`deployment/DEMO-SENARYO.md`](deployment/DEMO-SENARYO.md) |
| Pilot sözleşme | [`deployment/PILOT-SOZLESME-TASLAGI.md`](deployment/PILOT-SOZLESME-TASLAGI.md) |
| Pilot başarı kriterleri | [`deployment/PILOT-BASARI-KRITERLERI.md`](deployment/PILOT-BASARI-KRITERLERI.md) |
| KVKK veri işleme eki | [`deployment/KVKK-VERI-ISLEME-EKI.md`](deployment/KVKK-VERI-ISLEME-EKI.md) |
| Mağaza listeleme | [`deployment/STORE-LISTELEME.md`](deployment/STORE-LISTELEME.md) |
| Ortam şablonu | [`deployment/ANAHTARLAR.template.env`](deployment/ANAHTARLAR.template.env) |
| AI geliştirme kuralları | [`AGENTS.md`](AGENTS.md) |

---

## Lisans

Tescilli B2B SaaS. Tüm hakları saklıdır.
