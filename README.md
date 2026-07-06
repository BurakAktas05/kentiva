# 🏙️ Kentiva - Akıllı Kent ve Belediye Yönetim Platformu

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-brightgreen.svg?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-blue.svg?style=flat-square&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-blue.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![PostGIS](https://img.shields.io/badge/PostGIS-Spatial-blue.svg?style=flat-square&logo=postgis)](https://postgis.net)
[![Docker](https://img.shields.io/badge/Docker-Compatible-blue.svg?style=flat-square&logo=docker)](https://www.docker.com)
[![Gemini AI](https://img.shields.io/badge/Gemini%20AI-2.5%20Flash%20%2F%20Embeddings-orange.svg?style=flat-square)](https://deepmind.google/technologies/gemini/)

Kentiva; belediye operasyonlarını modernize etmek, vatandaş ihbar süreçlerini hızlandırmak, saha yönetimini optimize etmek ve belediye yöneticilerine gelişmiş coğrafi ve analitik raporlar sunmak üzere tasarlanmış **çok kiracılı (multi-tenant) B2B SaaS** akıllı şehir yönetim platformudur. 

Platform, tek bir altyapı üzerinde birden fazla belediyenin tamamen izole bir şekilde güvenle hizmet almasını sağlar.

---

## 🚀 Öne Çıkan Özellikler & Yeni Geliştirmeler

- **Çok Kiracılılık (Multi-Tenancy):** Tek bir veritabanı şeması ve kod tabanı üzerinde sınırsız belediye desteği. Her kiracı `municipality_id` üzerinden veri düzeyinde tam izoledir.
- **🧠 Semantik & Vektörel Mükerrer İhbar Tespiti (pgvector & Gemini):** Vatandaşların oluşturduğu ihbarlar Gemini API üzerinden asenkron olarak 768 boyutlu vektörlere dönüştürülür ve `pgvector` HNSW indeksi ile taranır. 
  - *Kesin Semantik Eşleşmeler (< 0.12 Cosine Distance):* Sistem tarafından otomatik olarak aynı `duplicate_group_id` altına bağlanır.
  - *Sınırda Eşleşmeler (< 0.28 Cosine Distance):* Gemini AI'a gönderilerek semantik doğrulama istenir, onaylanırsa otomatik gruplanır.
- **📞 Beyaz Masa (White Desk) Operatör Modülü:** Belediye çağrı merkezi operatörlerinin, telefonla veya yüz yüze gelen vatandaş şikayetlerini hızlıca sisteme girebilmesi için tasarlanmış özel klavye kısayolu destekli arayüz. Sık karşılaşılan sorunlar için "Hızlı Şablonlar" (Yol çukuru, bozuk kaldırım vb.) içerir.
- **📊 Yönetici Özeti & KPI Paneli (Executive Dashboard):** Belediyelerin pilot süreçlerindeki performanslarını izleyebileceği; toplam ihbarlar, çözüm oranları, departman bazlı iş yükü dağılımları ve coğrafi yoğunluk (District) verilerini içeren üst düzey görsel gösterge paneli.
- **🏆 90 Günlük Pilot & Başarı Takip Sistemi (Pilot Success):** Belediyelere sunulan 90 günlük ücretsiz deneme sürecini takip eden, sistemin aktif kullanım metriklerini (vatandaş sayısı, ihbar çözme hızları vb.) satış hedefleriyle karşılaştıran başarı paneli.
- **🎨 Belediye Pazarlama Kiti (Marketing Kit):** Belediyelerin vatandaşları Kentiva'ya davet edebilmesi için dinamik olarak üretilen QR kodlu afiş şablonları, sosyal medya duyuru görselleri ve belediye web sitesine eklenebilecek akıllı widget yönlendirmelerini içerir.
- **💰 Esnek Üyelik & Plan Yönetimi (Pricing):** Standard, Professional ve Enterprise üyelik modellerinin belediye bazlı yönetimini ve faturalandırma takibini kolaylaştıran lisanslama altyapısı.
- **🔒 Asenkron KVKK Anonimleştirme:** Yüklenen fotoğraflarda yüz ve araç plakaları Gemini AI ile arka planda asenkron taranır. Bounding box tespiti ve pikselleştirme işlemleri dosya yükleme `/upload` aşamasını yavaşlatmadan arka planda tamamlanır.
- **🛡️ Gelişmiş Rate Limiting (Caffeine Cache):** API limit aşımlarını izlemek için Bucket4j altyapısı Caffeine Cache ile entegre edilmiştir. Bellek sızıntılarını önleyen ve otomatik evict edilen 50.000 limitli bucket mimarisi aktiftir.

---

## 🛠️ Sistem Mimarisi ve Bileşenler

### 1. Backend API (Spring Boot)
*   **Teknoloji:** Java 21, Spring Boot 3
*   **Veritabanı:** PostgreSQL, PostGIS (Coğrafi sorgular) ve `pgvector` (Vektörel arama)
*   **Güvenlik:** JWT tabanlı durumsuz (stateless) kimlik doğrulama, Caffeine Cache destekli Bucket4j Rate Limiting, Brute-force koruması
*   **Entegrasyonlar:** NetGSM / Twilio SMS OTP, Cloudflare R2 / AWS S3 medya depolama alanları
*   **Raporlama:** Zebra desenli, durum ve öncelik bazında pastel renk kodlu premium PDF & Excel veri dışa aktarma

### 2. Yönetici Portalı (Admin Portal)
*   **Teknoloji:** React 19, Vite, Recharts, TailwindCSS
*   **Özellikler:** KPI izleme ekranları, canlı ısı haritası (Live Heatmap), departman bazlı saha görevlisi atama, Beyaz Masa hızlı giriş ekranı, Pilot başarı paneli, veri dışa aktarma ve PDF/Excel şablon yönetimi.

### 3. Vatandaş Mobil Uygulaması (Citizen Mobile)
*   **Teknoloji:** React 19, Ionic / Capacitor (Cross-platform)
*   **Özellikler:** GPS doğrulamalı konum tabanlı otomatik belediye seçimi, geofencing ihbar kilitleme UI, live kamera çekim zorunluluğu, Firebase push ve favori otobüs hatları/durakları paneli.

---

## 💻 Geliştirme Ortamı Kurulumu

### Docker ile Tek Komutla Çalıştırma (Full Stack)
Yerel testler veya sunum için API, PostgreSQL, Admin Portal ve Web sitelerini tek hamlede ayağa kaldırabilirsiniz:
```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```
*Detaylar için bkz: [`DOCKER.md`](DOCKER.md)*

### Manuel Kurulum Adımları
1. **Veritabanı:** PostgreSQL ve PostGIS eklentisinin kurulu ve aktif olduğundan emin olun.
2. **Çevre Değişkenleri:** `.env.example` dosyasını `.env` adıyla kopyalayın ve JWT secret, veritabanı şifrelerini doldurun.
3. **Backend Çalıştırma:**
   ```bash
   cd backend
   ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
   ```
4. **Varsayılan Yönetici Bilgileri:** Geliştirme profilinde (`dev`) süper yönetici hesabı: `admin@kentiva.app` / `admin123`
5. **Mobil Uygulama Başlatma:**
   ```bash
   cd belediyehattı
   npm install
   npm run dev
   ```

### 📚 API Dokümantasyonu (Swagger UI)
Yerel ortamda backend ayağa kalktıktan sonra, tüm API uç noktalarını incelemek ve canlı test etmek için aşağıdaki adresleri kullanabilirsiniz:
- **Swagger UI:** [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)
- **OpenAPI JSON Spec:** [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

---

## 📂 Proje Belgeleri ve Kaynaklar

- 🚀 **Canlı Yayınlama ve APK Oluşturma Rehberi:** [`yayınlama rehberi.md`](yayınlama%20rehberi.md)
- 🛠️ **Teknik Eksikler ve Takip Listesi:** [`todo_fixme.md`](todo_fixme.md)
- 📝 **Yerel Manuel Test ve ngrok Rehberi:** [`scripts/YEREL-MANUEL-TEST.md`](scripts/YEREL-MANUEL-TEST.md)
- 🗝️ **Çevre Değişkenleri Şablonu:** [`deployment/ANAHTARLAR.template.env`](deployment/ANAHTARLAR.template.env)
- 📜 **90 Günlük Pilot Sözleşme Taslağı:** [`deployment/PILOT-SOZLESME-TASLAGI.md`](deployment/PILOT-SOZLESME-TASLAGI.md)
- 🎯 **Pilot Başarı Kriterleri Raporu:** [`deployment/PILOT-BASARI-KRITERLERI.md`](deployment/PILOT-BASARI-KRITERLERI.md)

---

## 📄 Lisans

Bu proje tescilli bir B2B SaaS yazılımıdır. Tüm hakları saklıdır.
