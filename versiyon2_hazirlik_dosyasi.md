# 🏙️ Kentiva - Versiyon 2 Hazırlık ve Planlama Dosyası

Bu belge, Kentiva Akıllı Kent ve Belediye Yönetim Platformu'nun canlıya alım (pre-launch), geçiş süreci (migration) ve **Versiyon 2** geliştirme aşaması için gerekli olan teknik analizleri, yapılacak işleri (TODO/FIXME), temin edilmesi gereken entegrasyon anahtarlarını ve sistem iyileştirme standartlarını tek bir çatı altında toplamaktadır.

---

## 👁️ 1. Kullanıcı Gözüyle Sistem Analizi & Deneyimi (UX Audit)

Mevcut Kentiva mimarisi, belediye yöneticileri ve vatandaşlar için kritik süreçleri başarıyla yürütmektedir. Ancak, kullanıcı deneyimini (UX) üst seviyeye taşımak adına tespit edilen ve Versiyon 2'de iyileştirilmesi önerilen alanlar şunlardır:

### Vatandaş Mobil Uygulaması (Citizen App)
*   **Fotoğraf Caching & Senkronizasyon Geri Bildirimi:** Fotoğrafların yerel depolamada (`localStorage`/Capacitor Preferences) tutulması, internet bağlantısının zayıf olduğu durumlarda veri kaybını engellemektedir. Kullanıcıya "Çevrimdışı Mod: Fotoğraflarınız kaydedildi, bağlantı sağlandığında yüklenecektir" şeklinde görsel bir bildirim (toast/badge) sunulmalıdır.
*   **Kamera İzin Yönetimi:** Canlı kamera zorunluluğunda selfie/ön kamera kullanımı engellenerek doğrudan arka kamera (`direction: 'back'`) hedeflenmiştir. Kullanıcı kamerayı ilk kez açtığında izin reddedilirse, yönlendirici ve açıklayıcı bir modal ile sistem ayarlarına gitmesi sağlanmalıdır.
*   **Yetki Alanı Dışı İhbar Durumu:** Vatandaşın gönderdiği ihbar yetki alanı dışındaysa (`OUT_OF_JURISDICTION`), mobil arayüzde kırmızı renkli bir uyarı rozetiyle detaylı bir açıklama gösterilerek kullanıcının aklındaki soru işaretleri giderilmelidir.

### Yönetici Portalı (Admin Portal)
*   **Canlı Harita (LiveMap) Performansı:** Harita üzerinde yüzlerce ihbarın render edilmesi durumunda Leaflet marker clustering mimarisi aktif edilerek tarayıcı CPU kullanımı azaltılmalıdır.
*   **AI Analiz Geçişleri:** İhbar tablosundaki doğrudan AI analiz butonu kaldırılmış ve arka plan yükünü hafifletmek adına asenkron event tabanlı mimariye geçilmiştir. Bu durumun yöneticilere panel üzerinden pasif bir bilgilendirme rozetiyle sunulması faydalı olacaktır.

---

## 🗝️ 2. Temin Edilmesi Gereken API Anahtarları & Entegrasyonlar

Kentiva'nın tüm modülleriyle (SMS doğrulama, AI KVKK maskeleme, Push bildirim, Coğrafi konumlandırma) üretim (production) ortamında kesintisiz çalışabilmesi için alınması gereken API key ve hesap listesi aşağıdadır:

| Entegrasyon Alanı | Sağlayıcı / Servis | Amaç | Gerekli Parametreler |
| :--- | :--- | :--- | :--- |
| **Yapay Zeka (AI)** | Google AI Studio / Gemini | Asenkron KVKK (yüz/plaka) maskeleme, ihbar kategorizasyonu ve akıllı not taslağı oluşturma. | `GEMINI_API_KEY` |
| **SMS OTP** | NetGSM / Twilio | Vatandaşların cep telefonuyla doğrulanarak güvenli kayıt olması. | `NETGSM_USERCODE`, `NETGSM_PASSWORD` veya `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |
| **Mobil Push Bildirim** | Firebase Cloud Messaging (FCM) | İhbar durumu güncellendiğinde vatandaşın telefonuna anlık bildirim gönderme. | `google-services.json` (Android) ve `FIREBASE_CONFIG_BASE64` (Backend) |
| **Dosya Depolama** | Cloudflare R2 / AWS S3 | İhbar resimlerinin ve çözüldü kanıt fotoğraflarının bulutta güvenle saklanması. | `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_NAME` |
| **Harita Servisi (Tile)** | Mapbox / CartoDB Voyager | Admin portalı ve mobil uygulamada premium, performanslı harita katmanları sunmak. | Mapbox Access Token (Opsiyonel, açık harita alternatifleri mevcuttur) |
| **Uygulama Mağazaları** | Google Play & Apple App Store | Vatandaş uygulamasının mağazalarda yayınlanması ve güncellenmesi. | Geliştirici Hesapları (Developer Accounts) |

---

## 🛠️ 3. Teknik Borçlar, TODO & FIXME Listesi (V2 Yol Haritası)

### Backend (Spring Boot & Database)
- [ ] **ST_Contains Spatial Indexing (PostGIS):** `municipalities` ve `reports` tablolarındaki coğrafi sorguların hızlanması için `geometry` kolonlarına `GIST` indeksi atılmalı.
  ```sql
  CREATE INDEX idx_municipality_boundary_geom ON municipalities USING GIST (boundary);
  CREATE INDEX idx_report_location_geom ON reports USING GIST (geom);
  ```
- [ ] **Multi-Tenancy Indexing:** Sıkça sorgulanan `municipality_id` ve `status` kombinasyonları için birleşik indeks (composite index) tanımlanmalı.
  ```sql
  CREATE INDEX idx_reports_muni_status ON reports (municipality_id, status);
  ```
- [ ] **Nöbetçi Eczane Cache Limit:** Günlük bir kez güncellenen nöbetçi eczane bilgisi için uygulanan `EczaneApiDutyPharmacyService` yapısının bellek doluluğunu önlemek amacıyla Redis TTL veya Caffeine `expireAfterWrite` süresi 24 saate sabitlenmeli.
- [ ] **Reputation Score Loglama:** İtibar puanı değişikliklerini izlemek için bir denetim tablosu (`reputation_audit_logs`) oluşturularak puan hareketleri kayıt altına alınmalı.

### Frontend & Mobil (React & Capacitor)
- [ ] **WebSocket Reconnection Geliştirmesi:** `LiveMap.tsx` içindeki Stomp client bağlantı kopmalarında uygulanan exponential backoff mekanizmasına ek olarak tarayıcı çevrimdışı/çevrimiçi durum değişimleri (`window.addEventListener('online')`) dinlenmeli.
- [ ] **Chunk Splitting & Bundler Optimizasyonu:** `admin-portal` içerisindeki `Recharts` ve `Leaflet` gibi büyük kütüphaneler için Vite Rollup yapılandırmasında dinamik import (`lazy`/`Suspense`) dışında ayrı chunk tanımlamaları yapılmalı.
- [ ] **Çok Dilli (Localization) Eksiklikleri:** Dil dosyasındaki (`LanguageContext` ve `i18n.ts`) yeni eklenen durum kodlarının (`OUT_OF_JURISDICTION` vb.) İngilizce ve Arapça karşılıkları tamamlanmalı.

---

## 📈 4. Sektör Standartları & Performans Önerileri

1. **Bağlantı Havuzu (HikariCP) Ayarları:** Üretimde veritabanı kilitlenmelerini önlemek için `application-prod.properties` içinde HikariCP bağlantı sayısı optimum seviyede tutulmalı:
   ```properties
   spring.datasource.hikari.maximum-pool-size=20
   spring.datasource.hikari.minimum-idle=5
   spring.datasource.hikari.idle-timeout=300000
   ```
2. **Strict Content Security Policy (CSP):** XSS ve veri sızıntılarını önlemek için bulut sunucu seviyesinde güvenli HTTP başlıkları (Security Headers) ve CSP tanımlamaları yapılmalıdır.
3. **PWA Desteği:** Mobil web sürümünün yerel uygulama gibi çalışabilmesi ve çevrimdışı görsel önbellekleme yeteneklerinin artması için `belediyehattı` projesine Service Worker desteği eklenmelidir.
