# Kentiva Production Checklist

Bu kontrol listesi belediyeye canlı geçişten önce kapatılmalıdır.

## Zorunlu Teknik Koşullar

- `SPRING_PROFILES_ACTIVE=prod`
- `JWT_SECRET` en az 32 karakter ve rastgele üretilmiş olmalı
- `APP_SETUP_TOKEN` en az 32 karakter olmalı
- `APP_PUBLIC_URL` mutlaka `https://` ile başlamalı
- `APP_CORS_ALLOWED_ORIGINS` yalnızca gerçek HTTPS alan adlarını içermeli
- `APP_STORAGE_TYPE=s3` kullanılmalı
- `APP_CACHE_TYPE=redis` ve `REDIS_URL` tanımlı olmalı
- `MEDIA_GUARD_FAIL_OPEN=false`
- `MEDIA_VALIDATION_FAIL_OPEN=false`
- `MEDIA_ANONYMIZATION_FAIL_OPEN=false`
- `APP_SWAGGER_ENABLED=false`

## Operasyon Kontrolleri

- Veritabanı yedekleme politikası yazılı olmalı
- Obje depolama yaşam döngüsü ve erişim politikaları tanımlı olmalı
- Redis ve PostgreSQL sağlık kontrolleri izlenmeli
- `/actuator/health/readiness` deployment sonrası doğrulanmalı
- En az bir belediye tenant’ı ile smoke test yapılmalı
- Admin panel, vatandaş uygulaması ve public site HTTPS altında açılmalı

## Uygulama Smoke Testleri

- Vatandaş kayıt, giriş, şifre sıfırlama
- İhbar oluşturma, medya yükleme, takip görüntüleme
- Admin rapor görüntüleme, atama, çözme, reddetme
- Belediye onboarding akışında markalama, sınırlar, hesaplar, departmanlar ve entegrasyonlar
- Push bildirim ve webhook tetikleme
- İmzalı medya erişimi ve audit log kaydı

## Canlıya Çıkış Kriteri

- Backend testleri başarılı
- Admin portal test ve build başarılı
- Vatandaş uygulaması test ve build başarılı
- Public site test ve build başarılı
- Üretim environment değişkenleri eksiksiz
- Rollback planı yazılı ve erişilebilir
