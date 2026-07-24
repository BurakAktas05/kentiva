# Kentiva — Yayınlama, APK ve manuel test rehberi

Bu rehber production ortamını sırayla kurmanız içindir. Tüm anahtarlar için şablon: [`ANAHTARLAR.template.env`](ANAHTARLAR.template.env) → kopyalayıp `ANAHTARLAR.local.env` doldurun.

## Bileşenler

| Bileşen | Nerede host | Giriş |
|---------|-------------|-------|
| Backend API + PostgreSQL + Redis + RabbitMQ | **Railway / eşdeğer yönetilen altyapı** | — |
| Belediye yönetim paneli | **Vercel** (`admin-portal`) | `/login` → belediye çalışma alanı |
| Platform sahibi paneli | Aynı güvenli deployment, ayrı giriş | `/super-admin/login` (`/platform/login` kısayolu) |
| Kamu sitesi | **Vercel** (`public-site`) | Giriş yok |
| Vatandaş web (opsiyonel) | **Vercel** (`belediyehattı`) | Kayıt/giriş |
| Android APK | Yerel derleme | Vatandaş kayıt/giriş |

**Platform sahibi public site veya belediye girişinde oturum açmaz.** İlk kurulum:
`https://<admin-vercel>/setup`; sonraki girişler: `https://<admin-vercel>/super-admin/login`.
Belediye kullanıcıları `https://<admin-vercel>/login` üzerinden kendi çalışma alanına yönlenir.

---

## 1. Railway — Backend

### 1.1 Proje oluşturma

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo (`belediyeapp` kökü).
2. **PostgreSQL**, kalıcı **Redis** ve kalıcı **RabbitMQ** servislerini ekleyin.
   Bağlantı bilgilerini yalnızca backend servisine secret olarak bağlayın.
3. Servis ayarları:
   - Build: Dockerfile ([`Dockerfile`](../Dockerfile), [`railway.json`](../railway.json))
   - Healthcheck: `/actuator/health`

### 1.2 PostGIS

Flyway `V1__create_extensions.sql` ile `postgis` kurulur. İlk deploy’da extension hatası alırsanız Railway Postgres → **Query** sekmesinde bir kez çalıştırın:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 1.3 Ortam değişkenleri

[`ANAHTARLAR.template.env`](ANAHTARLAR.template.env) veya [`railway.env.example`](../railway.env.example) içindekileri Railway **Variables**’a yapıştırın.

**Minimum zorunlu:**

| Değişken | Açıklama |
|----------|----------|
| `JWT_SECRET` | `openssl rand -base64 64` |
| `APP_SETUP_TOKEN` | `openssl rand -hex 32` |
| `APP_PUBLIC_URL` | `https://<servis>.up.railway.app` |
| `APP_CORS_ALLOWED_ORIGINS` | Vercel URL’leri (virgülle); önce tahmini yazıp Vercel sonrası güncelleyin |
| `APP_CACHE_TYPE=redis` + `REDIS_URL` | Dağıtık cache ve rate-limit durumu |
| `APP_MESSAGING_RABBIT_ENABLED=true` | İhbar sonrası işlerin dayanıklı kuyrukta işlenmesi |
| `RABBITMQ_HOST/PORT/USERNAME/PASSWORD` | Kalıcı RabbitMQ bağlantısı |
| `APP_STORAGE_TYPE=s3` + S3/R2 anahtarları | Kalıcı ve ölçeklenebilir medya depolama |
| `MEDIA_GUARD_FAIL_OPEN=false` | Medya güvenliği üretimde kapalı geçilemez |
| `MEDIA_VALIDATION_FAIL_OPEN=false` | Medya doğrulaması üretimde kapalı geçilemez |
| `MEDIA_ANONYMIZATION_FAIL_OPEN=false` | Anonimleştirme üretimde kapalı geçilemez |

**Önerilen:** `GEMINI_API_KEY`, `FIREBASE_CONFIG_BASE64` ve altyapı kapasitesine
göre Hikari/async/Rabbit consumer değerleri. Prod profili eksik kalıcı depolama,
Redis, RabbitMQ, SMS, rate-limit veya fail-closed medya ayarıyla başlamayı reddeder.

### 1.4 Deploy doğrulama

```bash
curl https://<RAILWAY_HOST>/actuator/health
```

PowerShell:

```powershell
.\scripts\check-backend-health.ps1 -BaseUrl "https://<RAILWAY_HOST>"
```

Beklenen: `{"status":"UP"}` (veya benzeri).

---

## 2. Vercel — Admin portal

1. [vercel.com](https://vercel.com) → Import repo.
2. **Root Directory:** `admin-portal`
3. Framework: Vite (otomatik)
4. Build: `npm run build` — Output: `dist`
5. Environment:

```
VITE_API_BASE=https://<RAILWAY_HOST>/api/v1
VITE_ADMIN_PORTAL_BASE_URL=https://<VERCEL_ADMIN_URL>
VITE_PUBLIC_SITE_BASE=https://<PUBLIC_DOMAIN>
VITE_PUBLIC_SITE_ROOT_DOMAIN=<PUBLIC_ROOT_DOMAIN>
```

Belediye panelleri için wildcard DNS/SSL hazırsa ayrıca
`VITE_MUNICIPALITY_PORTAL_ROOT_DOMAIN=panel.<PUBLIC_ROOT_DOMAIN>` tanımlayın. Böylece
`belediye-kodu.panel.<PUBLIC_ROOT_DOMAIN>/municipality/login` adresleri kullanılır. Wildcard
altyapısı yoksa uygulama otomatik olarak güvenli
`/municipality/login?tenant=belediye-kodu` adresini üretir; yerelde de bu yöntem çalışır.

İsteğe bağlı `platform.<PUBLIC_ROOT_DOMAIN>` ve belediye wildcard alan adlarını aynı Vercel
deployment’ına bağlayabilirsiniz. Platform sahibi rotası yalnızca `/super-admin/login` üzerinden
belediyeye bağlı olmayan `ROLE_SUPER_ADMIN` hesabını kabul eder.

6. Deploy → URL’yi not edin (`VERCEL_ADMIN_URL`).

`vercel.json` SPA yönlendirmesi için repoda mevcuttur.

---

## 3. CORS güncelleme

Railway’de `APP_CORS_ALLOWED_ORIGINS` değerine ekleyin (virgül, boşluksuz):

```
https://<VERCEL_ADMIN_URL>,https://<VERCEL_PUBLIC_URL>,https://<VERCEL_CITIZEN_URL>
```

Yerel geliştirme için `http://localhost:5173,http://localhost:3000,http://localhost:5174` de kalabilir.

Redeploy backend (değişken kaydedince otomatik).

---

## 4. Süper admin kurulumu

1. Railway’de `APP_SETUP_TOKEN` tanımlı olsun.
2. Tarayıcı: `https://<VERCEL_ADMIN_URL>/setup`
3. Kurulum token’ı + e-posta/şifre girin → **İlk süper admin** oluşur.
4. `https://<VERCEL_ADMIN_URL>/super-admin/login` ile giriş yapın.
5. Süper admin (belediyeye bağlı olmayan) → platform belediye listesi görünür.

> Production’da `admin@kentiva.app` / `admin123` **yoktur**; yalnızca `dev` profilinde.

Kurulumdan sonra güvenlik için `APP_SETUP_TOKEN` değerini rotate edebilirsiniz (bootstrap bir kez).

---

## 5. Vercel — Public site

1. Yeni Vercel projesi, **Root Directory:** `public-site`
2. Environment:

```
VITE_API_BASE=https://<RAILWAY_HOST>/api/v1
VITE_ADMIN_PORTAL_URL=https://<VERCEL_ADMIN_URL>
VITE_MUNICIPALITY_PORTAL_URL=https://<VERCEL_ADMIN_URL>/login
VITE_SUPER_ADMIN_PORTAL_URL=https://<VERCEL_ADMIN_URL>/super-admin/login
VITE_SITE_URL=https://<VERCEL_PUBLIC_URL>
VITE_CITIZEN_APP_URL=https://<VERCEL_CITIZEN_URL>
```

3. Deploy → ana sayfa ve canlı istatistikler API’ye bağlanmalı; “Yönetim paneli” linki admin URL’sine gitmeli.

---

## 6. Vercel — Vatandaş web (opsiyonel)

**Root Directory:** `belediyehattı`

```
VITE_API_BASE_URL=https://<RAILWAY_HOST>/api/v1
```

---

## 7. Android APK (Windows)

### Önkoşullar

- Android Studio, JDK 21, Android SDK 36
- [`belediyehattı/README.md`](../belediyehattı/README.md)

### Production derleme

```powershell
# Otomatik (.env yazar + build + debug APK):
.\scripts\build-apk.ps1 -ApiBaseUrl "https://<RAILWAY_HOST>/api/v1"

# Release (imzalı keystore gerekir):
.\scripts\build-apk.ps1 -ApiBaseUrl "https://<RAILWAY_HOST>/api/v1" -Release
```

Elle:

```powershell
cd belediyehattı
copy .env.example .env
# .env: VITE_API_BASE_URL=https://<RAILWAY_HOST>/api/v1
# CAPACITOR_DEV_SERVER_URL TANIMLAMAYIN
npm install
npm run build:native
```

Push için (opsiyonel): `android/app/google-services.json` (Firebase Console).

**Release APK:**

- Android Studio → `npm run cap:android` → **Build → Generate Signed Bundle / APK**
- veya imzalı keystore ile: `cd android; .\gradlew.bat assembleRelease`

Release build **HTTPS** API zorunludur (HTTP cleartext kapalı).

### Hızlı debug APK

```powershell
cd belediyehattı\android
.\gradlew.bat assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

### Yerel manuel test (Railway yok — **APK en sonda**)

Tam rehber: [`scripts/YEREL-MANUEL-TEST.md`](../scripts/YEREL-MANUEL-TEST.md)

| Adım | Komut / iş |
|------|------------|
| 1–5 | `.\scripts\start-local.ps1` — DB, backend, tünel, admin, public (**APK yok**) |
| 3b | Siz doğrulayın: `https://…/actuator/health` |
| 6 | `.\scripts\build-apk-local.ps1` — tünel URL: `scripts/tunnel-url.txt` |

Kısa özet: [`scripts/README-local-test.txt`](../scripts/README-local-test.txt).

### Ortam

| Bileşen | Adres |
|---------|--------|
| Backend (PC + tünel) | `http://localhost:8080` / `https://XXXX.ngrok-free.app` |
| Belediye çalışma alanı seçimi | `http://localhost:5173/login` |
| Platform sahibi girişi | `http://localhost:5173/super-admin/login` |
| Kamu sitesi | `http://localhost:5174` |
| APK API | `https://XXXX.ngrok-free.app/api/v1` |

Tünel sonrası kök `.env`: `APP_PUBLIC_URL=https://XXXX.ngrok-free.app` (medya önizlemesi). `APP_CORS_ALLOWED_ORIGINS` için localhost portları yeterlidir; mobil uygulama tarayıcı CORS’una tabi değildir.

---

## Manuel test checklist

- [ ] `GET https://<RAILWAY_HOST>/actuator/health` → 200
- [ ] Admin `/setup` → süper admin oluştur
- [ ] Platform sahibi `/super-admin/login` → platform paneli
- [ ] Belediye `/login` → tenant seçimi → `/municipality/login?tenant=...`
- [ ] Public site açılıyor, istatistik API hatasız
- [ ] Public site → yönetim paneli linki doğru
- [ ] Admin’den API isteği → tarayıcıda CORS hatası yok
- [ ] APK: kayıt/giriş, bildirim oluşturma
- [ ] APK: foto yükleme (S3 ayarlıysa)
- [ ] Push (Firebase + `google-services.json` varsa)

---

## Sorun giderme

| Sorun | Çözüm |
|-------|--------|
| Flyway / PostGIS hata | DB’de `CREATE EXTENSION postgis;` |
| CORS hatası | `APP_CORS_ALLOWED_ORIGINS` tam Vercel origin (https, sonunda `/` yok) |
| Medya yüklenmiyor | `APP_STORAGE_TYPE=s3` ve S3/R2 anahtarları; `APP_PUBLIC_URL` doğru |
| APK API’ye bağlanmıyor | `VITE_API_BASE_URL` HTTPS; release’de cleartext kapalı |
| `/setup` token reddediyor | Railway `APP_SETUP_TOKEN` ile formdaki değer aynı mı |

---

## İlgili dosyalar

- [`ANAHTARLAR.template.env`](ANAHTARLAR.template.env) — tüm anahtarlar tek şablonda
- [`.env.example`](../.env.example) — backend yerel
- [`railway.env.example`](../railway.env.example) — Railway kısa liste
- [`belediyehattı/.env.example`](../belediyehattı/.env.example) — mobil/web vatandaş
