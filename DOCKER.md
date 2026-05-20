# Kentiva — Docker ile çalıştırma

PostgreSQL (PostGIS), Spring Boot API, Admin panel ve vatandaş web uygulamasını tek komutla ayağa kaldırır.

## Gereksinimler

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (veya Docker Engine + Compose v2)
- En az 4 GB boş RAM (ilk build Maven + npm indirmeleri için)

## Hızlı başlangıç

```bash
git clone https://github.com/BurakAktas05/kentiva.git
cd kentiva
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```

İlk açılışta API Flyway migration + dev seed çalışır (birkaç dakika sürebilir).

## Adresler

| Servis | URL |
|--------|-----|
| API | http://localhost:8080 |
| Swagger | http://localhost:8080/swagger-ui.html |
| Admin panel | http://localhost:5173 |
| Vatandaş (web) | http://localhost:3000 |
| PostgreSQL | `localhost:5432` (db: `belediyeapp`, user/pass: `.env.docker`) |

## Varsayılan hesap (dev seed)

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Süper admin | `admin@kentiva.app` | `admin123` |

Production ortamında bu hesabı kullanmayın; `APP_SETUP_TOKEN` ile `/setup` üzerinden kurulum yapın.

## Durdurma / temizlik

```bash
docker compose --env-file .env.docker down
# Veritabanını da silmek için:
docker compose --env-file .env.docker down -v
```

## Sadece API + veritabanı

```bash
docker compose --env-file .env.docker up --build db api
```

Frontend’leri yerelde `npm run dev` ile çalıştırıp `.env` içinde `VITE_API_BASE_URL=http://localhost:8080/api/v1` kullanabilirsiniz.

## Ortam değişkenleri

Tüm seçenekler `.env.docker.example` dosyasında. `JWT_SECRET` ve `DB_PASSWORD` üretimde mutlaka değiştirilmeli.
