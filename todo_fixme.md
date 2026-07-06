# 🛠️ Kentiva — TODO & FIXME Teknik Takip Listesi

Bu dosya, Kentiva platformunun geliştirme sürecindeki teknik borçlarını, eksiklerini, refaktör ihtiyaçlarını ve üretim ortamına geçiş öncesinde yapılması gereken kritik iyileştirmeleri takip etmek amacıyla oluşturulmuştur.

---

## 🛑 1. Canlıya Geçiş Öncesi Kritik Eksikler (Kritik TODO'lar)

- [ ] **Redis Entegrasyonu (Dağıtık Önbellek & Limit):**
  - **Durum:** Şu anda `Caffeine Cache` bellek içi (in-memory) çalışmaktadır. Uygulama birden fazla container (sunucu) olarak ölçeklendiğinde rate limit ve veri tutarsızlığı yaşamamak için `APP_CACHE_TYPE=redis` yapılandırılması aktif edilmeli ve `REDIS_URL` tanımlanmalıdır.
  - **Dosya:** [SecurityConfig.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/config/SecurityConfig.java), [application.properties](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/resources/application.properties)

- [ ] **S3 / Cloudflare R2 Obje Depolama Entegrasyonu:**
  - **Durum:** Geliştirme (dev) ortamında yüklenen vatandaş fotoğrafları yerel diskte tutulmaktadır. Railway sunucusu her yeniden başlatıldığında bu dosyalar silinecektir. Canlıda `APP_STORAGE_TYPE=s3` yapılandırılarak AWS S3 veya Cloudflare R2 bucket'ları tanımlanmalıdır.
  - **Dosya:** [application.properties](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/resources/application.properties)

- [ ] **Üretim Sırlarının Tanımlanması (Secrets):**
  - **Durum:** Canlıya alırken `JWT_SECRET` ve `APP_SETUP_TOKEN` değerlerinin kesinlikle varsayılan veya zayıf değerler olmaması, en az 32-64 karakterlik rastgele karmaşık anahtarlardan oluşması zorunludur.

- [ ] **Canlı Alan Adı ve HTTPS Yapılandırması:**
  - **Durum:** Release APK'nın çalışabilmesi için Android güvenlik kuralları gereği API adresinin `https://` ile şifrelenmiş olması gerekir. SSL sertifikalarının tanımlanması ve Vercel/Railway alan adlarının HTTPS'e yönlendirilmesi kontrol edilmelidir.

---

## ⚡ 2. Teknik Borçlar ve Kod İçi Refaktörler (FIXME & Refactoring)

- [ ] **`ReportDuplicateLinkService` Hata Toleransı:**
  - **Açıklama:** pgvector aramaları veya Gemini embedding üretimi başarısız olduğunda sistem konum tabanlı yedek (fallback) akışına (`linkNearbyDuplicates`) geçmektedir. Ancak buradaki hata yakalama ve loglama mekanizması daha detaylı hale getirilmeli, Gemini API 429 (Rate Limit) hataları için üst üste deneme (retry) desteği eklenmelidir.
  - **Dosya:** [ReportDuplicateLinkService.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/service/report/ReportDuplicateLinkService.java)

- [ ] **pgvector Semantik Eşleşme Threshold Değerleri:**
  - **Açıklama:** Semantik mükerrer ihbar tespitinde kullanılan kesin eşleşme (`0.12` auto-link) ve sınırda eşleşme (`0.28` Gemini verification) eşik değerleri (threshold) test verilerine göre kalibre edilmiştir. Gerçek kullanıcı verileriyle bu değerlerin sapma oranları incelenmeli ve gerekirse dinamik hale getirilmelidir.
  - **Dosya:** [ReportDuplicateLinkService.java#L69](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/service/report/ReportDuplicateLinkService.java#L69), [IReportRepository.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/repository/IReportRepository.java)

- [ ] **Yönetici KPI ve Pilot Rapor Performansı:**
  - **Açıklama:** `ExecutiveDashboardPage` ve `PilotSuccessPage` üzerindeki istatistiki veriler her sayfa açılışında veritabanından anlık hesaplanmaktadır. Büyük belediyelerde (yüksek ihbar sayısında) bu durum sorgu performansını düşürecektir. İlgili istatistikler saatlik/günlük olarak Caffeine veya Redis üzerinde cache'lenmelidir.
  - **Dosya:** [PlatformDashboardService.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/service/admin/PlatformDashboardService.java)

- [ ] **Android Keystore Güvenliği:**
  - **Açıklama:** Android release derlemelerinde kullanılan şifreleyici anahtarlar (Keystore) ve şifrelerin derleme scriptleri içerisinde sert metin (hardcoded) olarak kalmadığı, environment değişkenlerinden beslendiği düzenli kontrol edilmelidir.
  - **Dosya:** [build-apk.ps1](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/scripts/build-apk.ps1)

---

## 📈 3. Gelecek Sürüm Geliştirmeleri (Roadmap & Enhancements)

- [ ] **KVKK Asenkron Fotoğraf Anonimleştirme Kuyruk Güvenliği:**
  - **Açıklama:** Fotoğraflardaki yüz ve plaka maskeleme işlemlerinin asenkron olarak event-bus üzerinden işlenmesi sağlanmıştır. İşlem sırasında başarısız olan fotoğraf yüklemeleri için bir Dead Letter Queue (DLQ) veya otomatik yeniden deneme (retry log) yapısı kurulmalıdır.

- [ ] **NetGSM / Twilio SMS OTP Gönderim Takibi:**
  - **Açıklama:** Mobil vatandaş girişlerinde gönderilen doğrulama kodlarının (OTP) durum kodları ve kalan SMS kredisi bilgileri yönetici paneline rapor olarak yansıtılmalıdır.

- [ ] **Otomatik Veri Temizliği (GDPR/KVKK Cleanup Job):**
  - **Açıklama:** Çözüme kavuşturulmuş ve üzerinden 90 gün geçmiş ihbarlara ait kişisel verilerin (vatandaş adı, telefon numarası, maskelenmemiş orijinal fotoğraflar) otomatik olarak temizlenmesi veya arşivlenmesi için bir Spring `@Scheduled` job'ı yazılmalıdır.
