# Kentiva

Çok kiracılı (multi-tenant) mimariyle belediyelerin vatandaş bildirimlerini toplaması, işlemesi ve raporlaması için uçtan uca platform: mobil vatandaş uygulaması, yönetim paneli, kamuya açık istatistik arayüzü ve Spring Boot API.

**Kaynak kod:** [github.com/BurakAktas05/kentiva](https://github.com/BurakAktas05/kentiva)

```bash
git clone https://github.com/BurakAktas05/kentiva.git
cd kentiva
```

---

## Mimari

| Bileşen | Konum | Teknoloji |
|--------|--------|-----------|
| API | `src/` | Spring Boot 3.4, Java 21, JWT, Flyway, PostGIS |
| Yönetim paneli | `admin-portal/` | React 19, TypeScript, Vite, Tailwind CSS |
| Vatandaş uygulaması | `belediyehattı/` | React, Capacitor (Android) |
| Kamu sitesi | `public-site/` | React, Vite (belediye özetleri / istatistik) |
| Medya doğrulama | `services/media-guard/` | Python |
| SQL yardımcıları | `scripts/` | Örnek kullanıcı / seed notları |

---

## Özellikler (özet)

- Kiracı bazlı belediye (`municipality` / slug), marka ve ayarlar
- Vatandaş raporu: konum, kategori, medya; durum akışı ve zaman çizelgesi
- Yönetim tarafında departmanlar, kullanıcılar, harita ve dışa aktarım
- Kamu API: belediye listesi / özet istatistikler (`publicapi`)
- İsteğe bağlı: Redis önbellek, WebSocket, Gemini ile kategori önerisi, Firebase bildirimleri, S3 uyumlu nesne depolama (ör. Cloudflare R2)

---

## Gereksinimler

- Java 21+, Maven 3.9+
- PostgreSQL 15+ ve **PostGIS** + `uuid-ossp`
- Node.js 18+ (frontend paketleri için)

---

## Veritabanı

```sql
CREATE DATABASE belediyeapp;
\c belediyeapp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
```

Kök dizinde `.env.example` dosyasını `.env` olarak kopyalayıp değişkenleri doldurun.  
Yerel **dev** profili için `src/main/resources/application-dev.properties.example` dosyasını `application-dev.properties` olarak kopyalayıp kendi DB kullanıcı/şifrenizi yazın (gerçek `application-dev.properties` repoda takip edilmez).

---

## Backend

```bash
./mvnw -DskipTests spring-boot:run
```

Varsayılan adres: `http://localhost:8080`  
Swagger UI: `http://localhost:8080/swagger-ui.html`

Aktif profil örneği (dev Flyway konumları ve örnek veriler için):

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

---

## Frontendlar

**Admin panel**

```bash
cd admin-portal
npm install
npm run dev
```

**Vatandaş (web / Capacitor için derleme öncesi)**

```bash
cd belediyehattı
npm install
npm run dev
```

**Kamu sitesi**

```bash
cd public-site
npm install
npm run dev
```

Her pakette `.env.example` varsa API tabanı için kopyalayın (`VITE_*`).

---

## Demo hesapları (Flyway seed)

| Rol | E-posta | Şifre (örnek seed) |
|-----|---------|---------------------|
| Süper / platform admin | `admin@ibb.gov.tr` | `admin123` |
| Safranbolu belediye admin | `admin@safranbolu.bel.tr` | `admin123` |
| Safranbolu vatandaş | `safranbolu@test.local` | `password123` |

Ek yerel test kullanıcıları için `scripts/seed-demo-users.sql` dosyasına bakın. **Üretimde** bu hesapları devre dışı bırakın veya şifreleri zorunlu olarak sıfırlayın.

---

## Dağıtım

Docker: kökteki `Dockerfile`.  
Railway örneği: `railway.json` ve ortam değişkenleri için `.env.example` içindeki açıklamalar.

Tipik üretim değişkenleri: `DATABASE_URL` veya JDBC eşleniği, güçlü `JWT_SECRET`, `SPRING_PROFILES_ACTIVE=prod`, CORS kökenleri, depolama (`APP_STORAGE_TYPE`, S3/R2), isteğe bağlı `GEMINI_API_KEY`, `FIREBASE_CONFIG_BASE64`, `MEDIA_GUARD_URL`.

---

## Lisans

Bu depo özel bir projedir; izin olmadan çoğaltma ve dağıtım yapılmamalıdır.
