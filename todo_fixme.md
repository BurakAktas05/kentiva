# 🛠️ Kentiva — TODO & FIXME Teknik Takip Listesi

Bu dosya, Kentiva platformunun geliştirme sürecindeki teknik borçlarını, eksiklerini, refaktör ihtiyaçlarını ve üretim ortamına geçiş öncesinde yapılması gereken kritik iyileştirmeleri takip etmek amacıyla oluşturulmuştur.

---

## 🛑 1. Canlıya Geçiş Öncesi Kritik Eksikler (Kritik TODO'lar)

- [x] **Redis Entegrasyonu (Dağıtık Önbellek & Limit):**
  - **Durum:** ✅ `RedisConfig.java` ve `LocalCacheConfig.java` mevcut. `APP_CACHE_TYPE=redis` ve `REDIS_HOST/PORT/PASSWORD` ortam değişkenleriyle aktif ediliyor. Dashboard cache'leri (PILOT_STATS, EXECUTIVE_DASHBOARD) eklendi.
  - **Dosya:** [SecurityConfig.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/config/SecurityConfig.java), [application.properties](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/resources/application.properties)

- [x] **S3 / Cloudflare R2 Obje Depolama Entegrasyonu:**
  - **Durum:** ✅ `S3Config.java` ve `StorageService.java` mevcut. `APP_STORAGE_TYPE=s3` ile aktif ediliyor.
  - **Dosya:** [application.properties](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/resources/application.properties)

- [x] **Üretim Sırlarının Tanımlanması (Secrets):**
  - **Durum:** ✅ `ProductionSecretsValidator.java` uygulama başlangıcında kontrol ediyor.

- [x] **Canlı Alan Adı ve HTTPS Yapılandırması:**
  - **Durum:** ✅ Altyapı yapılandırması — Vercel/Railway panelinden yapılır.

---

## ⚡ 2. Teknik Borçlar ve Kod İçi Refaktörler (FIXME & Refactoring)

- [x] **`ReportDuplicateLinkService` Hata Toleransı:**
  - **Açıklama:** ✅ Gemini API 429 (Rate Limit) ve 503 (Service Unavailable) hataları için exponential backoff retry mekanizması eklendi. Hata türüne göre detaylı loglama (HttpClientErrorException / HttpServerErrorException ayrıştırması) ve AtomicLong sayaçlarla metrik izleme eklendi.
  - **Dosya:** [ReportDuplicateLinkService.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/service/report/ReportDuplicateLinkService.java)

- [x] **pgvector Semantik Eşleşme Threshold Değerleri:**
  - **Açıklama:** ✅ Hardcoded `0.12` ve `0.28` threshold değerleri `@Value` ile `application.properties`'ten okunacak şekilde dinamik hale getirildi (`app.report.duplicate.strict-threshold`, `app.report.duplicate.borderline-threshold`).
  - **Dosya:** [ReportDuplicateLinkService.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/service/report/ReportDuplicateLinkService.java), [application.properties](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/resources/application.properties)

- [x] **Yönetici KPI ve Pilot Rapor Performansı:**
  - **Açıklama:** ✅ `PilotSuccessService.getSummary()` ve `PlatformDashboardService.getDashboard()` metodlarına `@Cacheable` eklendi. Cache isimleri (`PILOT_STATS`, `EXECUTIVE_DASHBOARD`) hem Caffeine hem Redis konfigürasyonlarına tanımlandı (15dk ve 10dk TTL).
  - **Dosya:** [PlatformDashboardService.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/service/admin/PlatformDashboardService.java), [PilotSuccessService.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/service/pilot/PilotSuccessService.java)

- [x] **Android Keystore Güvenliği:**
  - **Açıklama:** ✅ `build-apk.ps1` scripti artık keystore bilgilerini `KENTIVA_KEYSTORE_PATH`, `KENTIVA_KEYSTORE_PASSWORD`, `KENTIVA_KEY_ALIAS`, `KENTIVA_KEY_PASSWORD` ortam değişkenlerinden okuyor. Eksik değişkenlerde hata mesajı ve `gradle.properties` hardcoded şifre uyarısı veriyor.
  - **Dosya:** [build-apk.ps1](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/scripts/build-apk.ps1)

---

## 📈 3. Gelecek Sürüm Geliştirmeleri (Roadmap & Enhancements)

- [x] **KVKK Asenkron Fotoğraf Anonimleştirme Kuyruk Güvenliği:**
  - **Açıklama:** ✅ `MediaAnonymizationFailure` entity ve DLQ tablosu (V102 migration) oluşturuldu. `ImageAnonymizationService`'e `recordFailure()` ve `@Scheduled retryFailedAnonymizations()` (30dk periyot) eklendi. Maksimum 5 retry sonrası manuel inceleme bayrağı.

- [x] **NetGSM / Twilio SMS OTP Gönderim Takibi:**
  - **Açıklama:** ✅ `SmsOtpService`'e AtomicLong sayaçlarla SMS metrik izleme (gönderilen/başarılı/hatalı/OTP/bildirim) eklendi. `SmsMetricsResponse` DTO ve `GET /api/v1/admin/platform/sms-metrics` endpoint'i ile süper admin paneline rapor sunuluyor.

- [x] **Otomatik Veri Temizliği (GDPR/KVKK Cleanup Job):**
  - **Açıklama:** ✅ `KvkkDataCleanupService` — `@Scheduled(cron = "0 0 3 * * *")` ile her gün 03:00'da çalışır. 90 gün önce RESOLVED olan ihbarların FCM token, AI yanıt taslağı, medya dosyaları temizlenir. `app.kvkk.cleanup.enabled=true` ile aktif edilir.
