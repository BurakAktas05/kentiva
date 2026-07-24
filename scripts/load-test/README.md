# Kentiva yük ve dayanıklılık testleri

Bu paket, k6 ile backend kapasitesini ölçer ve rate-limit sözleşmesini ayrı bir testte doğrular. Varsayılan kapasite hedefi **5 dakika boyunca toplam 100 istek/sn**, `p95 < 500 ms`, HTTP hata oranı `< %1`, başarılı kontrol oranı `> %99` ve sıfır düşürülen iterasyondur.

## Güvenlik sınırları

- Script `TARGET_ENV=prod|production` değerlerini koşulsuz reddeder.
- Uzak hedef yalnızca `TARGET_ENV=staging`, `ALLOW_REMOTE_TARGET=true` ve `LOAD_TEST_CONFIRM=KENTIVA_STAGING_LOAD_TEST` birlikte verildiğinde kabul edilir.
- İhbar veya oturum kaydı üreten testler ayrıca `ALLOW_WRITES=true` ister. Ayrı ve silinebilir bir test veritabanı kullanın.
- Gerçek vatandaş parolalarını ya da tokenlarını repoya eklemeyin. `private-credentials.json` git tarafından dışlanmıştır.
- Kapasite testi için rate-limit yalnızca izole backend sürecinde `APP_SECURITY_RATE_LIMIT_ENABLED=false` ile kapatılabilir. `prod` profili bu ayarla başlamayı otomatik olarak reddeder.

## İş yükleri

`capacity.js` içindeki `WORKLOAD` seçenekleri:

| Değer | İstek |
| --- | --- |
| `auth` | JWT doğrulaması yapan `GET /api/v1/auth/me` |
| `citizen-list` | Vatandaşın kendi ihbar listesi |
| `admin-list` | Belediye personeli ihbar listesi |
| `create` | Medyasız metin ihbarı oluşturma |
| `mixed` | Varsayılan: 25 auth + 30 vatandaş liste + 35 admin liste + 10 oluşturma = 100 istek/sn |

`RPS` varsayılan olarak `100`, `DURATION` ise `5m` değerindedir. Karma senaryoda toplamı değiştirmek için `AUTH_RPS`, `CITIZEN_LIST_RPS`, `ADMIN_LIST_RPS` ve `CREATE_RPS` değerlerinin toplamı `RPS` ile aynı olmalıdır.

## Kimlik bilgileri

Tek hesap için `CITIZEN_EMAIL`, `CITIZEN_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` kullanılabilir. Hazır JWT kullanmak için `CITIZEN_TOKEN(S)` ve `ADMIN_TOKEN(S)` virgülle ayrılmış biçimde verilebilir.

Çoklu hesap gerektiğinde `credentials.example.json` dosyasını `private-credentials.json` adıyla kopyalayın ve `CREDENTIALS_FILE=./private-credentials.json` verin. Kapasite testinde login yalnızca `setup` aşamasında yapılır; ölçülen auth akışı her istekte JWT doğrulamasıdır.

`CATEGORY_ID` verilmezse ilk aktif kategori API'den bulunur. `MUNICIPALITY_ID`, `LATITUDE`, `LONGITUDE` ve `DISTRICT` oluşturulan ihbarın tenant/konum kapsamını belirler. Varsayılan koordinatlar Gümüşhacıköy merkezidir.

## Çalıştırma

Önce ayrı test backend'ini rate-limit kapalı olarak başlatın. Bu anahtarı production ortamında kullanmayın.

```powershell
$env:APP_SECURITY_RATE_LIMIT_ENABLED = 'false'
mvn -f backend/pom.xml spring-boot:run
```

Başka bir terminalde yerel karma kapasite testini çalıştırın:

```powershell
$env:BASE_URL = 'http://localhost:8080'
$env:TARGET_ENV = 'local'
$env:ALLOW_WRITES = 'true'
$env:CITIZEN_EMAIL = 'test-vatandas@ornek.local'
$env:CITIZEN_PASSWORD = 'yalnizca-test-parolasi'
$env:ADMIN_EMAIL = 'test-admin@ornek.local'
$env:ADMIN_PASSWORD = 'yalnizca-test-parolasi'
$env:MUNICIPALITY_ID = 'gumushacikoy-test-tenant-id'
k6 run --summary-export .\scripts\load-test\results\capacity-summary.json .\scripts\load-test\capacity.js
```

Tek akışı ölçmek için örneğin `$env:WORKLOAD = 'create'` kullanın. Kapasite testi başlangıç kontrolünde rate-limit header'ı görürse durur. Yeterli sayıda farklı test kullanıcısıyla gerçek rate-limit açıkken test yapılacaksa bilinçli olarak `REQUIRE_RATE_LIMIT_DISABLED=false` verilebilir.

Rate-limit koruması için backend'i koruma açıkken yeniden başlatın ve kısa sözleşme testini çalıştırın:

```powershell
$env:APP_SECURITY_RATE_LIMIT_ENABLED = 'true'
$env:ALLOW_WRITES = 'true'
k6 run --summary-export .\scripts\load-test\results\rate-limit-summary.json .\scripts\load-test\rate-limit.js
```

Bu test ilk geçerli login isteklerinden sonra `429`, `Retry-After`, `X-RateLimit-*` header'ları ve `RATE_LIMIT_EXCEEDED` hata kodunu bekler.

Yerel kapasite testinin oluşturduğu Gümüşhacıköy kayıtlarını ve test vatandaşının
puanını seed durumuna döndürmek için, yük üreticisi tamamen durduktan sonra
`cleanup-local-data.sql` dosyasını yalnızca yerel/demo veritabanında çalıştırın.
Script, beklenmeyen vatandaş verisi görürse işlemi otomatik olarak geri alır.

## Sonuç değerlendirme

k6 terminal özeti ve `results/*-summary.json` dosyalarında throughput, p50/p95/p99, hata oranı ve düşürülen iterasyonlar bulunur. Test sırasında Actuator/altyapı metriklerinden ayrıca CPU, bellek, Hikari aktif/bekleyen bağlantı, PostgreSQL sorgu süresi, RabbitMQ kuyruk derinliği/consumer sayısı ve Redis gecikmesi izlenmelidir. Eşiklerden biri geçmezse sürüm yük testi açısından kabul edilmez.
