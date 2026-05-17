# Kentiva — Vatandaş uygulaması (React + Vite + Capacitor)

Web, Android ve iOS için belediye bildirim uygulaması.

## Web geliştirme

1. `npm install`
2. `.env` / `.env.local` içinde API adresini ayarlayın (bkz. `.env.example`)
3. `npm run dev` — http://localhost:3000

## Üretim web derlemesi

```bash
npm run build
npm run preview
```

## Native (Capacitor) — Android & iOS

Önkoşullar:

- **Android:** Android Studio, JDK 21, SDK 36
- **iOS:** macOS, Xcode (simülatör veya cihaz; Windows’ta yalnızca `cap add ios` / sync yapılabilir, derleme Mac gerekir)

### Her native derlemeden önce

```bash
npm run build          # dist üretir
npx cap sync           # dist → android/ ve ios/ kopyalar, eklentileri günceller
```

Kısayol: `npm run build:native` (= build + sync)

### Android emülatör veya cihaz

```bash
npm run build:native
npm run cap:android    # Android Studio açar → Run
# veya tek komut:
npm run cap:run:android
```

Debug’da canlı yenileme (aynı Wi‑Fi):

```bash
npm run dev
# Başka terminal:
set CAPACITOR_DEV_SERVER_URL=http://BILGISAYAR_IP:3000
npx cap sync
npm run cap:run:android
```

Üretim APK: `CAPACITOR_DEV_SERVER_URL` **vermeyin**; `release` build’de cleartext kapalıdır.

### iOS simülatör veya cihaz (macOS)

```bash
npm run build:native
cd ios/App && pod install && cd ../..
npm run cap:ios        # Xcode açar → Run (simülatör veya cihaz)
# veya:
npm run cap:run:ios
```

İlk kez iOS yoksa: `npx cap add ios` (bir kez), ardından `npm run build:native`.

### İzinler

- Konum: bildirim konumu, belediye seçimi
- Kamera / galeri: fotoğraflı bildirim
- Bildirimler: push (FCM)

Android manifest ve iOS `Info.plist` bu izinler için yapılandırılmıştır.

### Push (FCM) kurulumu

**Backend:** Proje kökünde `FIREBASE_CONFIG_BASE64` — Firebase Console → Proje ayarları → Hizmet hesapları → JSON indir, ardından Base64:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

**Android:** `belediyehattı/android/app/google-services.json` dosyasını Firebase Console’dan indirip koyun (yoksa push çalışmaz; Gradle uyarısı loglanır).

**iOS:** Xcode’da hedef → Signing & Capabilities → **Push Notifications** ve **Background Modes → Remote notifications** ekleyin. APNs anahtarı/sertifikası Firebase’e yüklenmelidir.

**Test:** Giriş yaptıktan sonra uygulama `PATCH /api/v1/users/fcm-token` ile token kaydeder. Rapor durumu değişince (REJECTED, PROCESSING vb.) push gelir; bildirime dokununca rapor detayı açılır. Firebase Console → Messaging → tek cihaz token’ı ile de test edebilirsiniz.
