# Kentiva Production Checklist

Bu kontrol listesi belediyeye canlı geçişten önce kapatılmalıdır.

Rehberler: [`README.md`](README.md) · [`YAYINLAMA.md`](YAYINLAMA.md) · [`MEDIA-GUARD.md`](MEDIA-GUARD.md) · [`ROLLBACK.md`](ROLLBACK.md)

## Zorunlu Teknik Koşullar

- `SPRING_PROFILES_ACTIVE=prod` (zorunlu; `prod` olmadan OTP bypass ve geliştirme varsayılanları risklidir)
- `SMS_OTP_DEV_BYPASS_ENABLED` üretimde asla `true` olmamalı (varsayılan `false`; `prod` profili de kapatır)
- `JWT_SECRET` en az 32 karakter ve rastgele üretilmiş olmalı
- `APP_SETUP_TOKEN` en az 32 karakter olmalı
- `APP_PUBLIC_URL` mutlaka `https://` ile başlamalı
- `APP_CORS_ALLOWED_ORIGINS` yalnızca gerçek HTTPS alan adlarını içermeli
- `APP_STORAGE_TYPE=s3` kullanılmalı
- `APP_CACHE_TYPE=redis` ve `REDIS_URL` tanımlı olmalı
- `APP_MESSAGING_RABBIT_ENABLED=true`; RabbitMQ kullanıcı/parolası, kalıcı disk ve health check tanımlı olmalı
- `HIKARI_MAX_POOL`, async worker/queue ve RabbitMQ consumer değerleri hedef altyapı kapasitesine göre ayarlanmalı
- `MEDIA_GUARD_FAIL_OPEN=false`
- `MEDIA_GUARD_URL` yalnızca iç ağdan erişilebilen media-guard servisini göstermeli
- `MEDIA_VALIDATION_FAIL_OPEN=false`
- `MEDIA_ANONYMIZATION_FAIL_OPEN=false`
- `GEMINI_API_KEY` medya doğrulama ve KVKK anonimleştirme için tanımlı olmalı
- `APP_SWAGGER_ENABLED=false`

## Operasyon Kontrolleri

- Veritabanı yedekleme politikası yazılı olmalı
- Obje depolama yaşam döngüsü ve erişim politikaları tanımlı olmalı
- Redis, PostgreSQL ve RabbitMQ sağlık kontrolleri izlenmeli
- RabbitMQ kuyruk derinliği, consumer sayısı ve dead-letter/retry alarmları tanımlanmalı
- `/actuator/health/readiness` deployment sonrası doğrulanmalı
- En az bir belediye tenant’ı ile smoke test yapılmalı
- Admin panel, vatandaş uygulaması ve public site HTTPS altında açılmalı
- Platform sahibi `/super-admin/login` ile, belediye hesapları `/login` çalışma alanı seçimiyle giriş yapmalı
- Wildcard belediye panel alan adı kullanılıyorsa DNS, TLS sertifikası ve `VITE_MUNICIPALITY_PORTAL_ROOT_DOMAIN` birlikte doğrulanmalı
- Platform hesabının belediye portalında; belediye hesabının platform portalında reddedildiği test edilmeli
- Android yayınında `KENTIVA_ANDROID_KEYSTORE_PATH`, `KENTIVA_ANDROID_KEYSTORE_PASSWORD`, `KENTIVA_ANDROID_KEY_ALIAS` ve `KENTIVA_ANDROID_KEY_PASSWORD` güvenli CI değişkenleri olarak tanımlanmalı

## Uygulama Smoke Testleri

- Vatandaş kayıt, giriş, şifre sıfırlama
- İhbar oluşturma, medya yükleme, takip görüntüleme
- Admin rapor görüntüleme, atama, çözme, reddetme
- Belediye A hesabının Belediye B tenant URL veya sorgu parametresiyle girişinin reddedilmesi
- Belediye onboarding akışında markalama, sınırlar, hesaplar, departmanlar ve entegrasyonlar
- Push bildirim ve webhook tetikleme
- İmzalı medya erişimi ve audit log kaydı

## Canlıya Çıkış Kriteri

- Backend testleri başarılı
- Admin portal test ve build başarılı
- Vatandaş uygulaması test ve build başarılı
- Public site test ve build başarılı
- İzole staging ortamında 5 dakika / 100 istek-sn kapasite testi: p95 < 500 ms, hata < %1, dropped iteration = 0
- Rate-limit sözleşme testi: standart `429`, `Retry-After` ve `X-RateLimit-*` başlıkları başarılı
- Üretim environment değişkenleri eksiksiz
- Rollback planı yazılı ve erişilebilir
