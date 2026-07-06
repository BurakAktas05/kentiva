# 🚀 Kentiva — Yayınlama ve Canlıya Geçiş Rehberi

Bu rehber, Kentiva Akıllı Kent ve Belediye Yönetim Platformu'nun üretim (production) ortamına kurulumu, yapılandırılması ve test edilmesi süreçlerini adım adım açıklamaktadır.

---

## 🏛️ Mimari ve Host Dağılımı

Kentiva, çok kiracılı (multi-tenant) yapıda tasarlanmış olup şu bileşenlerden oluşur:

| Bileşen | Sunucu / Servis | Giriş / Erişim Yolu |
|---|---|---|
| **Backend API (Java/Spring)** | **Railway** (Docker) | `https://<api-servis>.up.railway.app` |
| **Yönetici Portalı (Admin)** | **Vercel** (`admin-portal` klasörü) | `/setup` (İlk kurulum), `/login` (Giriş) |
| **Halk/Tanıtım Sitesi (Public)** | **Vercel** (`public-site` klasörü) | `/` (Girişsiz) |
| **Vatandaş Mobil Uygulaması** | **Android Studio / Gradle** (APK) | Mobil Cihaz |
| **Vatandaş Web Sürümü (Opsiyonel)** | **Vercel** (`belediyehattı` klasörü) | `/login` / `/register` |

---

## 1. ⚙️ Railway Sunucu Kurulumu (Backend & DB)

### 1.1. Proje Oluşturma
1. [railway.app](https://railway.app) adresine gidin.
2. **New Project** → **Deploy from GitHub repo** adımlarını izleyerek `belediyeapp` deposunu seçin.
3. Projeye bir **PostgreSQL** veritabanı servisi ekleyin (Veritabanı eklendiğinde `DATABASE_URL` değişkeni otomatik olarak tanımlanır).

### 1.2. PostGIS Coğrafi Bilgi Sistemi Kurulumu
Kentiva, harita ve geofencing konum aramaları için PostGIS eklentisine ihtiyaç duyar. Flyway göç aracı (`V1__create_extensions.sql`) bu eklentiyi otomatik kurmaya çalışır. Yetki veya sürüm hatası alırsanız, Railway Postgres **Query** sekmesinde şu SQL sorgusunu manuel olarak çalıştırın:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 1.3. Ortam Değişkenleri (Variables)
Railway platformundaki backend servisinize ait **Variables** sekmesine gidin ve aşağıdaki değişkenleri tanımlayın:

#### 🔐 Kritik Güvenlik Değişkenleri
| Değişken Adı | Açıklama / Önerilen Değer |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` (Üretim profilini aktif etmek için zorunludur) |
| `JWT_SECRET` | En az 32-64 karakter uzunluğunda rastgele üretilmiş base64 dizesi (`openssl rand -base64 64`) |
| `APP_SETUP_TOKEN` | Süper admin ilk kurulum ekranı için güvenli token (`openssl rand -hex 32`) |
| `APP_PUBLIC_URL` | Canlı API adresiniz (Örn: `https://api.kentiva.app` veya `https://belediyeapp-production.up.railway.app`) |

#### 📂 Depolama, AI ve Bildirimler
| Değişken Adı | Açıklama / Önerilen Değer |
|---|---|
| `APP_STORAGE_TYPE` | `s3` (Canlıda yerel disk yerine S3 veya Cloudflare R2 kullanılmalıdır) |
| `AWS_ACCESS_KEY` / `AWS_SECRET_KEY` | S3/R2 erişim anahtarları |
| `AWS_BUCKET_NAME` | Medya dosyalarının depolanacağı bucket adı |
| `AWS_ENDPOINT` | R2 kullanılıyorsa Cloudflare endpoint adresi |
| `GEMINI_API_KEY` | KVKK yüz/plaka asenkron maskeleme ve semantik ihbar analizi için Gemini API anahtarı |
| `FIREBASE_CONFIG_BASE64` | Vatandaş mobil push bildirimleri için Firebase Admin SDK JSON dosyasının Base64 hali |
| `APP_CACHE_TYPE` | `redis` (Çoklu container ölçeklemelerinde dağıtık cache için gereklidir) |
| `REDIS_URL` | Railway üzerinde oluşturulan Redis servisinin bağlantı adresi |
| `APP_SWAGGER_ENABLED` | `false` (Güvenlik nedeniyle canlı ortamda API dokümantasyonu kapatılmalıdır) |

---

## 2. 🖥️ Vercel Kurulumları (Frontend Portal ve Siteler)

Tüm ön uç projeleri Vercel üzerinde barındırılmaktadır. Kurulum adımları her biri için benzerdir:

### 2.1. Yönetici Portalı (`admin-portal`)
1. Vercel paneline girin, **Add New** → **Project** yolunu izleyip GitHub deponuzu içeri aktarın (Import).
2. **Root Directory** olarak `admin-portal` klasörünü seçin.
3. Framework preset: **Vite** (otomatik algılanır).
4. Yapılandırma (Build) komutları: `npm run build` — Çıktı klasörü: `dist`
5. **Environment Variables** bölümüne şu değişkeni girin:
   ```env
   VITE_API_BASE=https://<API_HOST_ADRESINIZ>/api/v1
   ```
6. **Deploy** butonuna basın ve oluşan canlı adresi (`VERCEL_ADMIN_URL`) not edin.

### 2.2. Halk ve Tanıtım Sitesi (`public-site`)
1. Yeni bir Vercel projesi ekleyin ve **Root Directory** olarak `public-site` klasörünü seçin.
2. Çevre değişkenlerini tanımlayın:
   ```env
   VITE_API_BASE=https://<API_HOST_ADRESINIZ>/api/v1
   VITE_ADMIN_PORTAL_URL=https://<VERCEL_ADMIN_URL>
   VITE_SITE_URL=https://<VERCEL_PUBLIC_URL>
   VITE_CITIZEN_APP_URL=https://<VERCEL_CITIZEN_URL>
   ```
3. Projeyi canlıya alın.

### 2.3. Vatandaş Web Arayüzü (`belediyehattı` - Opsiyonel)
1. **Root Directory** olarak `belediyehattı` klasörünü seçin.
2. Çevre değişkenini tanımlayın:
   ```env
   VITE_API_BASE_URL=https://<API_HOST_ADRESINIZ>/api/v1
   ```
3. Projeyi canlıya alın.

---

## 3. 🌐 CORS Ayarlarının Güncellenmesi

Ön uç uygulamalarının canlı API ile sorunsuz haberleşebilmesi (tarayıcı CORS engeline takılmaması) için Railway üzerindeki API servisinizin `APP_CORS_ALLOWED_ORIGINS` değişkenini güncelleyin:

```env
APP_CORS_ALLOWED_ORIGINS=https://<VERCEL_ADMIN_URL>,https://<VERCEL_PUBLIC_URL>,https://<VERCEL_CITIZEN_URL>
```
*Not: Adresler arasında boşluk bırakılmamalı ve sonlarında `/` işareti bulunmamalıdır.*

---

## 4. 🔑 Süper Admin Kurulumunun Yapılması

Backend ve Admin portalı yayına alındıktan sonra sisteme giriş yapabilmek için ilk süper yöneticinin oluşturulması gerekir:

1. Tarayıcıda şu adrese gidin: `https://<VERCEL_ADMIN_URL>/setup`
2. Railway değişkenlerinde tanımladığınız `APP_SETUP_TOKEN` değerini girin.
3. Süper yöneticinin e-posta ve şifresini belirleyerek formu gönderin.
4. Başarılı kurulumun ardından `https://<VERCEL_ADMIN_URL>/login` adresinden giriş yapabilirsiniz.
5. *Güvenlik Önerisi:* İlk kurulumdan sonra Railway panelinden `APP_SETUP_TOKEN` değerini değiştirebilir veya silebilirsiniz.

---

## 📱 5. Android APK Oluşturma Rehberi

Mobil vatandaş uygulamasının Android sürümünü derlemek için aşağıdaki adımları uygulayın.

### 5.1. Önkoşullar
* Bilgisayarınızda **Android Studio**, **JDK 21** ve **Android SDK 36** kurulu olmalıdır.
* Proje kökündeki `google-services.json` (Firebase konsolundan indirilen) dosyası `belediyehattı/android/app/` dizinine yerleştirilmiş olmalıdır.

### 5.2. Debug (Hata Ayıklama) APK Derleme
Geliştiriciler ve test ekibi için hızlıca kurulabilir bir APK dosyası üretmek için:
```powershell
cd belediyehattı
# .env dosyası oluşturup VITE_API_BASE_URL=https://<API_HOST_ADRESINIZ>/api/v1 yazın
npm install
npm run build:native
cd android
# Windows Powershell üzerinden Gradle yardımıyla derleme yapın:
.\gradlew.bat assembleDebug
```
Oluşan test APK dosyası şu dizindedir:
`belediyehattı/android/app/build/outputs/apk/debug/app-debug.apk`

*Alternatif Otomatik Script:*
Kök dizinden Powershell ile şu komutu çalıştırarak süreci otomatikleştirebilirsiniz:
```powershell
.\scripts\build-apk.ps1 -ApiBaseUrl "https://<API_HOST_ADRESINIZ>/api/v1"
```

### 5.3. Production (Canlı/Yayın) İmzalı APK Derleme
Google Play Store'da yayınlanacak veya belediyeye teslim edilecek nihai paket için:
1. Android Studio ile `belediyehattı/android` projesini açın.
2. Üst menüden **Build** → **Generate Signed Bundle / APK** adımlarını takip edin.
3. Keystore dosyanızı (anahtar deposu) seçerek şifreleri girin.
4. Derleme modunu **Release** seçip işlemi tamamlayın.

*Not:* Canlı sürüm (Release APK) güvenlik kuralları gereği kesinlikle **HTTPS** protokolüne sahip bir API adresine bağlanmalıdır.

---

## 🔍 6. Canlı Ortam Kontrol Listesi (Smoke Test)

Canlı ortamın düzgün çalıştığını doğrulamak için şu adımları doğrulayın:

- [ ] `GET https://<API_HOST>/actuator/health` adresinden `{"status":"UP"}` yanıtı dönüyor mu?
- [ ] Admin portalında `/setup` ekranından ilk kurulum sorunsuz tamamlanabiliyor mu?
- [ ] Tanıtım (Public) web sitesinde istatistikler ve harita dinamik olarak API'den yükleniyor mu?
- [ ] Vatandaş uygulaması üzerinden yeni ihbar oluşturulabiliyor ve yüklenen fotoğraf başarıyla KVKK maskelemesinden geçiyor mu?
- [ ] Gönderilen fotoğraf S3/R2 depolama alanından imzalı URL ile admin panelinde görüntülenebiliyor mu?
- [ ] Aynı konumda mükerrer (benzer) ihbar oluşturulduğunda, **pgvector** ve **Gemini** altyapısı bu durumları tespit edip gruplayabiliyor mu?
