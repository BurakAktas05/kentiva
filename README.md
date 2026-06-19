# 🏙️ Kentiva - Akıllı Kent ve Belediye Yönetim Platformu

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-brightgreen.svg?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue.svg?style=flat-square&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-blue.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![PostGIS](https://img.shields.io/badge/PostGIS-Spatial-blue.svg?style=flat-square&logo=postgis)](https://postgis.net)
[![Docker](https://img.shields.io/badge/Docker-Compatible-blue.svg?style=flat-square&logo=docker)](https://www.docker.com)
[![Gemini AI](https://img.shields.io/badge/Gemini%20AI-2.5%20Flash-orange.svg?style=flat-square)](https://deepmind.google/technologies/gemini/)

Kentiva; belediye operasyonlarını modernize etmek, vatandaş ihbar süreçlerini hızlandırmak, saha yönetimini optimize etmek ve belediye yöneticilerine gelişmiş coğrafi ve analitik raporlar sunmak üzere tasarlanmış **çok kiracılı (multi-tenant) B2B SaaS** akıllı şehir yönetim platformudur. 

Platform, tek bir altyapı üzerinde birden fazla belediyenin tamamen izole bir şekilde güvenle hizmet almasını sağlar.

---

## 🚀 Öne Çıkan Özellikler

- **Çok Kiracılılık (Multi-Tenancy):** Tek bir veritabanı şeması ve kod tabanı üzerinde sınırsız belediye desteği. Her kiracı `municipality_id` üzerinden veri düzeyinde tam izoledir.
- **Asenkron KVKK Anonimleştirme:** Yüklenen fotoğraflarda yüz ve araç plakaları Gemini AI ile arka planda asenkron taranır. Bounding box tespiti ve pikselleştirme işlemleri dosya yükleme `/upload` aşamasını yavaşlatmadan arka planda tamamlanır.
- **Normalleştirilmiş Koordinat Desteği:** Gemini bounding box verilerinde hassasiyet kaybını önlemek için normalleştirilmiş `[0-1000]` aralığı kullanılır ve backend tarafında görüntü boyutuna göre dinamik ölçeklenir.
- **Gelişmiş Rate Limiting (Caffeine Cache):** API limit aşımlarını izlemek için Bucket4j altyapısı Caffeine Cache ile entegre edilmiştir. Bellek sızıntılarını önleyen ve otomatik evict edilen 50.000 limitli bucket mimarisi aktiftir.
- **Konum Tabanlı Akıllı Seçim:** Mobil uygulama açılışında vatandaşın GPS konumu otomatik taranır. Eğer vatandaş Kentiva üyesi bir ilçedeyse ilgili belediyeye otomatik bağlanır; üye olmayan bir bölgeye geçtiğinde ise eski belediyesinde kalır.
- **Mekansal Engelleyici Geofencing:** Vatandaş üye olmayan bir konumdan ihbar oluşturmaya çalıştığında form kilitlenir ve premium bölge dışı uyarı kartı gösterilir.
- **Dinamik Markalama (Custom Branding):** Belediyeler kendi birincil renklerini, logolarını ve sloganlarını admin paneli üzerinden kod yazmadan veya yeniden canlıya almadan anında güncelleyebilir.
- **Yapay Zeka Destekli Analiz (Gemini AI):** İhbarlar yapay zeka tarafından özetlenir, kategorisi kontrol edilir, öncelik derecesi atanır ve vatandaşlara iletilecek SMS/Push şablonları otomatik olarak oluşturulur.
- **Güven Puanı (Reputation Score) Modeli:** Vatandaşların ihbar kalitesine göre dinamik olarak hesaplanan puanlama algoritması sayesinde sistem suistimalleri otomatik olarak engellenir.

---

## 🛠️ Sistem Mimarisi ve Bileşenler

### 1. Backend API (Spring Boot)
*   **Teknoloji:** Java 21, Spring Boot 3
*   **Veritabanı:** PostgreSQL & PostGIS (Coğrafi sorgular, mekansal indeksleme)
*   **Güvenlik:** JWT tabanlı durumsuz (stateless) kimlik doğrulama, Caffeine Cache destekli Bucket4j Rate Limiting, Brute-force koruması
*   **Entegrasyonlar:** NetGSM / Twilio SMS OTP, Cloudflare R2 / AWS S3 medya depolama alanları
*   **Raporlama:** Zebra desenli, durum ve öncelik bazında pastel renk kodlu premium PDF & Excel veri dışa aktarma

### 2. Yönetici Portalı (Admin Portal)
*   **Teknoloji:** React 19, Vite, TailwindCSS
*   **Özellikler:** KPI izleme ekranları, canlı ısı haritası (Live Heatmap), departman bazlı saha görevlisi atama, ulaşım hatları AI import ve PDF/Excel şablon yönetimi.

### 3. Vatandaş Mobil Uygulaması (Citizen Mobile)
*   **Teknoloji:** React 19, Ionic / Capacitor (Cross-platform)
*   **Özellikler:** GPS doğrulamalı konum tabanlı otomatik belediye seçimi, geofencing ihbar kilitleme UI, live kamera çekim zorunluluğu, Firebase push ve favori otobüs hatları/durakları paneli.

---

## 🎯 Yayın Öncesi & Kötüye Kullanım Kontrol Listesi

Uygulamayı canlı ortama (production) almadan önce sistemin güvenliğini ve kararlılığını sağlamak için tasarlanan tüm kurallar detaylı kılavuzda yer almaktadır:

> [!TIP]
> Kötüye kullanım koruma kuralları, görsel müstehcenlik analizleri, itibar puanlama sınırları ve yayın öncesi teknik kontrol adımları için mutlaka **[todo.md](todo.md)** dosyasını inceleyin.

### Özet Kontrol Maddeleri:
- [x] **Asenkron KVKK Anonimleştirme:** Yüz/plaka maskeleme ve tescil taramaları asenkron event kuyruğuna taşındı.
- [x] **Caffeine Rate Limit:** Bellek verimliliği yüksek evicting cache mekanizması devreye alındı.
- [x] **Geofencing & Bölge Dışı Bloklama:** Mobil NewReport ekranında üye olmayan alanlardan ihbar gönderimi engellendi.
- [x] **Onboarding & Picker Yenilemesi:** Framer Motion staggered list geçişleri ve modern tab capsule yapıları eklendi.
- [x] **Otobüs Hatları AI İmport:** PDF/Excel hat şemalarının Gemini ile taranıp mobil haritaya basılması sağlandı.
- [x] **Mobil Favori Desteği:** Durak ve hat yıldızlama entegrasyonu tamamlandı.
- [x] **İhbar Denetim PDF Görsel İyileştirmesi:** Zebra desenli satırlar ve durum/öncelik pastel badge tasarımları eklendi.
- [x] **Düşük İtibar Bloklama:** Güven puanı **30** puanın altına düşen kullanıcıların yeni ihbar oluşturması engellendi.

---

## 💻 Yerel Geliştirme Ortamı Kurulumu

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

## 📂 Yardımcı Belgeler ve Kaynaklar
- 📝 **Yayınlama ve APK Oluşturma Rehberi:** [`deployment/YAYINLAMA.md`](deployment/YAYINLAMA.md)
- 🧪 **Yerel Manuel Test ve ngrok Rehberi:** [`scripts/YEREL-MANUEL-TEST.md`](scripts/YEREL-MANUEL-TEST.md)
- 🗝️ **Çevre Değişkenleri Şablonu:** [`deployment/ANAHTARLAR.template.env`](deployment/ANAHTARLAR.template.env)
- 🛡️ **Kötüye Kullanımı Önleme Kılavuzu:** [`todo.md`](todo.md)

---

## 📄 Lisans

Bu proje tescilli bir B2B SaaS yazılımıdır. Tüm hakları saklıdır.
