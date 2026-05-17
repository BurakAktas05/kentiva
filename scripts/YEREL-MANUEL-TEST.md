# Yerel manuel test (Railway yok — ngrok / localtunnel)

Telefondan ihbar oluşturup bilgisayardan admin panelinde görmek için bu sırayı **aynen** izleyin.

**Önemli:** APK en sonda derlenir. `start-local.ps1` APK üretmez.

---

## Ön hazırlık (bir kez)

1. PostgreSQL + PostGIS, veritabanı `belediyeapp`
2. Proje kökünde `.env` (`.env.example` kopyası): `DB_PASSWORD`, `JWT_SECRET`
3. JDK 21, Node.js, npm
4. Tünel aracı: [ngrok](https://ngrok.com/download) **veya** `npx localtunnel` (ek kurulum gerekmez)
5. Android SDK + `belediyehattı/android` (APK için — adım 6’da)

---

## Çalıştırma sırası

| Adım | Ne | Komut / adres |
|------|-----|----------------|
| **1** | PostgreSQL ayakta | Servis / pgAdmin — port `5432` |
| **2** | Backend API | `start-local.ps1` açar veya zaten `http://localhost:8080` |
| **3** | HTTPS tünel | Aynı script — URL `scripts/tunnel-url.txt` dosyasına yazılır |
| **3b** | **Siz doğrulayın** | Tarayıcı veya telefon: `https://…/actuator/health` → UP |
| **4** | Admin panel (PC) | http://localhost:5173 — API: `localhost:8080` |
| **5** | Kamu sitesi (PC) | http://localhost:5174 |
| **6** | **APK (en son)** | `.\scripts\build-apk-local.ps1` |

### Tek komutla 1–5 (APK hariç)

```powershell
cd C:\Users\AKTASSAK\Desktop\belediyeapp
.\scripts\start-local.ps1
```

ngrok veya otomatik seçim (`auto` = ngrok varsa ngrok, yoksa localtunnel):

```powershell
.\scripts\start-local.ps1 -TunnelProvider ngrok
.\scripts\start-local.ps1 -TunnelProvider localtunnel
```

Tünel URL dosyası: `scripts/tunnel-url.txt` (APK scripti bunu okur).

### PC tarayıcı adresleri

| Amaç | URL |
|------|-----|
| İlk kurulum (süper admin) | http://localhost:5173/setup |
| Giriş | http://localhost:5173/login |
| Süper admin paneli | http://localhost:5173/ |
| Belediye yöneticisi | Giriş sonrası normal panel |
| Kamu sitesi | http://localhost:5174 |

**Dev profili** (Flyway dev-migration): `admin@kentiva.app` / `admin123` — yalnızca yerel geliştirme.

Admin ve public site **localhost** üzerinden API’ye gider; telefon/APK ise **tünel HTTPS** kullanır.

---

## Adım 6 — APK (tünel doğrulandıktan sonra)

1. `scripts/tunnel-url.txt` içindeki kök URL’yi kontrol edin (ör. `https://abc.ngrok-free.app`)
2. Sağlık: `https://abc.ngrok-free.app/actuator/health`
3. Derleme:

```powershell
.\scripts\build-apk-local.ps1
```

Elle URL vermek için:

```powershell
.\scripts\build-apk-local.ps1 -TunnelUrl "https://SUBDOMAIN.ngrok-free.app"
```

Release APK:

```powershell
.\scripts\build-apk-local.ps1 -Release
```

**Çıktı (debug):** `belediyehattı\android\app\build\outputs\apk\debug\app-debug.apk`

APK’yı telefona yükleyin; ihbar oluşturun; admin panelinden (`http://localhost:5173`) kaydı kontrol edin.

---

## Ortam değişkenleri (özet)

| Bileşen | Değişken | Yerel manuel test |
|---------|----------|-------------------|
| Backend | `APP_PUBLIC_URL` | Tünel kökü (https, sonda `/` yok) — script yazar |
| Admin | `VITE_API_BASE` | `http://localhost:8080/api/v1` |
| Public | `VITE_API_BASE` | `http://localhost:8080/api/v1` |
| APK | `VITE_API_BASE_URL` | `https://TUNEL/api/v1` — `build-apk-local` yazar |

---

## Sorun giderme

| Sorun | Çözüm |
|-------|--------|
| PostgreSQL bağlanmıyor | Servis, şifre, DB adı `belediyeapp` |
| Backend açılmıyor | Backend penceresindeki hata; `.env` JWT/DB |
| Tünel URL yok | ngrok kurulu mu? veya `-TunnelProvider localtunnel` |
| APK API’ye gitmiyor | Adım 3b sağlık kontrolü; HTTPS zorunlu |
| Foto önizleme boş | `APP_PUBLIC_URL` tünel ile aynı mı? |
| CORS (sadece tarayıcı) | Admin/public localhost origin — backend varsayılan CORS yeterli |

Üretim (Railway/Vercel): [`deployment/YAYINLAMA.md`](../deployment/YAYINLAMA.md)
