# Kentiva Yayın Öncesi Analiz Raporu

Tarih: 25 Temmuz 2026
Durum: Şartlı hazır — kod tabanı release candidate seviyesinde, canlı ortam kapıları henüz tamamlanmadı

## Yönetici özeti

Kentiva’nın backend, yönetim portalı, vatandaş uygulaması, public sitesi, media-guard servisi ve dağıtım yapılandırmaları yayın öncesi incelendi. Test ve üretim derlemeleri başarılıdır. İnceleme sırasında bulunan güvenlik ve kullanıcı deneyimi engelleri giderilmiştir.

Kod tabanı kontrollü bir staging yayınına hazırdır. Buna karşın doğrudan genel canlı yayına “tamam” denmemelidir. Gerçek staging ortamında kritik uçtan uca akış, yük testi, yedek geri dönüşü, mağaza imzalama ve üretim servis bağlantıları tamamlanmadan canlıya çıkış onayı verilmemelidir.

## Bu denetimde giderilen kritik bulgular

### Vatandaş uygulaması

- Açılış, giriş ve kayıt ekranları açık renkli Kentiva tasarım diline uyarlandı.
- Splash geçişini kilitleyen zamanlayıcı sorunu giderildi.
- Misafir girişinin belediye seçimine ve misafir ana sayfasına ilerlemesi düzeltildi.
- Misafir oturumunda özel kullanıcı API’lerinin çağrılması engellendi.
- Kayıt ve şifre sıfırlama asgari şifre uzunluğu backend politikasıyla 10 karakterde eşlendi.
- Yeni uygulama ikonu ve Android/iOS/PWA ikon setleri üretildi.
- Android yedekleme kapatıldı; release imzalama bilgileri ortam değişkenlerine bağlandı.

### Kimlik doğrulama ve portal güvenliği

- Yönetim portalındaki yalnızca tarayıcıda çalışan, sabit kod kabul eden sahte SMS doğrulama adımı kaldırıldı.
- Sunucunun başarıyla ürettiği tokenlar güvenli oturum depolamasına yazılarak giriş tamamlanıyor.
- Mobil yönetim girişinde kritik form ilk ekrana alındı.
- Giriş alanları programatik olarak etiketlendi ve yönetici şifre sıfırlama alt sınırı 12 karaktere çıkarıldı.
- Üretimde SMS OTP geliştirme kısa yolu varsayılan olarak kapatıldı.

### KVKK ve medya güvenliği

- Anonim ihbar takibinden medya bağlantıları ve iç işlem notları kaldırıldı.
- Görsel anonimleştirme servisinin bozuk/boş AI yanıtını “tespit yok” sayarak orijinal görseli bırakabildiği fail-open yolu kapatıldı.
- Üretim başlangıcı artık `MEDIA_GUARD_URL` ve `GEMINI_API_KEY` olmadan başarısız oluyor.
- Media-guard istek gövdesine 12 MB sınır kondu; büyük veya geçersiz uzunluklu istekler reddediliyor.
- Media-guard, doğrulama ve anonimleştirme adımlarının üretimde fail-closed olması zorunlu tutuldu.

### Tenant izolasyonu ve API

- Personel ihbar araması belediye ve departman kapsamını koruyan sunucu taraflı filtrelere taşındı.
- Belediyesini seçmemiş vatandaşın istemci tarafından verilen başka bir belediye kapsamını sorgulaması engellendi.
- Genel ihbar takip uç noktasına oran sınırlama eklendi.
- Hassas akışlar için tenant, erişim ve kamu API testleri başarıyla çalıştı.

### CI, bağımlılıklar ve operasyon

- Frontend CI zincirine lint adımı eklendi.
- E2E testleri ortam değişkeni yoksa atlanıyor; değişkenler verildiğinde başarısız test artık CI’ı durduruyor.
- Mobil üretim bağımlılık taraması sıfır bulguya indirildi.
- Yönetim portalı React Router 7.18.1’e yükseltildi; public sitede React Router ve PostCSS yamaları uygulandı.
- Railway örneğine zorunlu RabbitMQ ve media-guard değişkenleri eklendi.
- Docker Compose yapılandırması ve media-guard konteyneri doğrulandı.

## Doğrulama sonuçları

- Backend: 146 test çalıştı, 0 hata, 0 başarısız, 1 ortam bağımlı entegrasyon testi atlandı.
- Yönetim portalı: lint başarılı; 16 test başarılı; üretim derlemesi başarılı.
- Vatandaş uygulaması: typecheck/lint başarılı; 21 test başarılı; üretim derlemesi başarılı.
- Public site: typecheck/lint başarılı; 12 test başarılı; üretim derlemesi başarılı.
- Android: Capacitor senkronizasyonu ve `bundleRelease` başarılı.
- Media-guard: Docker imajı başarılı; health endpoint’i ve 12 MB istek sınırı smoke testi başarılı.
- Docker Compose: örnek ortam dosyasıyla yapılandırma doğrulaması başarılı.
- E2E: test iskeleti çalıştı; staging adresleri ve test hesapları verilmediği için 1 senaryo atlandı.
- Görsel kontrol: 390×844, 768×1024 ve 1440×900 boyutlarında public site, yönetim girişi ve vatandaş uygulamasında yatay taşma, kırık görsel veya tarayıcı hatası görülmedi.
- Gizli dosya kontrolü: yerel `.env`, Firebase ve Google servis dosyaları ignore kuralları içinde; commit kapsamına alınmadı.

## Bilinen kalan riskler

### Yayın öncesi zorunlu kapılar

- İzole staging ortamında vatandaş kayıt/giriş, ihbar oluşturma, medya yükleme, admin atama/durum değişikliği ve vatandaş takibi uçtan uca çalıştırılmalı.
- Belediye A hesabının Belediye B verisine erişemediği gerçek veritabanı ve gerçek JWT ile doğrulanmalı.
- PostgreSQL, Redis, RabbitMQ, S3/R2, media-guard, Netgsm, Gemini ve gerekiyorsa Firebase üretim değişkenleri atanmalı.
- Android App Bundle gerçek yayın anahtarıyla imzalanmalı; keystore depoya eklenmemeli.
- iOS release derlemesi, imzalama, izin metinleri ve App Store arşivi macOS/Xcode ortamında doğrulanmalı.
- Yedek alma ve geri yükleme tatbikatı yapılmalı.
- Log, alarm, uptime ve kuyruk derinliği izleme bağlanmalı.
- 5 dakika / 100 istek-sn kapasite testi ile p95, hata oranı ve dropped iteration kriterleri ölçülmeli.
- Mağaza gizlilik beyanları, KVKK metinleri ve veri silme prosedürü hukuk/operasyon sahibi tarafından onaylanmalı.

### Bağımlılık istisnası

`npm audit --omit=dev`, yönetim portalı ve public sitede React Router’ın yalnızca RSC/server-action çalışma biçimini etkileyen iki yüksek seviye kaydı raporluyor. Her iki uygulama da statik BrowserRouter SPA olarak çalışıyor; RSC, SSR veya server action kullanmıyor. Kullanılan sürüm 7.18.1 ve diğer yönlendirme açıklarının yamalarını içeriyor. Buna rağmen upstream tamamen temiz bir sürüm yayımlandığında tekrar güncellenmelidir.

### Doğrulanamayan alanlar

- Bu Windows makinesinde iOS derlemesi yapılamadı.
- Gerçek üretim sırları ve dış servisler kullanılmadı.
- Android release bundle imzalama anahtarı olmadığı için üretilen yerel AAB imzasızdır.
- Staging E2E ve kapasite testi ortam bilgileri bulunmadığı için çalıştırılamadı.

## Sonuç

Kentiva kod tabanı, mevcut otomatik ve görsel kontroller temelinde staging için hazır bir release candidate’tır. Kod tarafında tespit edilen yayın engelleyiciler kapatılmıştır. Canlı yayın kararı için yukarıdaki ortam, imzalama, E2E, kapasite, yedek ve operasyon kapıları tamamlanmalıdır.
