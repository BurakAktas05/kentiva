# Kentiva - Smart City and Municipality Management Platform

Kentiva is a B2B SaaS platform designed to modernize municipal operations, streamline citizen reporting, and provide advanced geographical and analytical insights for city administrators. It operates on a multi-tenant architecture, allowing multiple municipalities to use the platform in complete isolation while sharing a single infrastructure.

## Platform Components

1.  **Backend API (Spring Boot)**
    *   Java 21, Spring Boot 3
    *   PostgreSQL & PostGIS (Spatial queries, ST_Contains)
    *   Stateless architecture with JWT authentication
    *   Bucket4j Rate Limiting, Brute-force protection
    *   Integration with NetGSM/Twilio for SMS OTP
    *   AWS S3 / Cloudflare R2 object storage for media

2.  **Citizen Application (Mobile & Web)**
    *   React / Ionic for cross-platform availability
    *   Location-based reporting (requires GPS verification)
    *   Live camera photo requirement (MediaGuard integration) to prevent fake reports
    *   Push notifications (Firebase)

3.  **Admin Portal (Web)**
    *   React, Vite, TailwindCSS
    *   Executive Dashboard for KPI tracking
    *   Live Heatmap and Geographic reporting
    *   Role-Based Access Control (Admin, Dept Manager, Field Officer)
    *   AI-assisted report summarization and auto-reply drafts

## Key Features

*   **Multi-Tenancy:** Single codebase handles unlimited municipalities. Each tenant is isolated at the database level using `municipality_id`.
*   **Custom Branding:** Municipalities can configure their primary color, logo, and slogan from the admin portal without code deployment.
*   **Geographic Boundaries:** Supports GeoJSON uploads. The system automatically rejects reports that fall outside the municipal borders using PostGIS spatial algorithms.
*   **Enterprise Security:** Hardened against DDoS, brute-force, and SQL injection. Swagger is disabled in production environments.

## Docker (yerel tam yığın)

Arkadaşınıza veya yerel test için tek komutla API + PostgreSQL + Admin + Vatandaş web:

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```

Ayrıntılar: [`DOCKER.md`](DOCKER.md)

## Deployment Instructions (Railway / Cloud)

This application is containerized and ready for PaaS providers like Railway, Render, or AWS AppRunner.

1.  Provision a PostgreSQL database with the `PostGIS` extension enabled.
2.  Set up an S3-compatible storage bucket for media uploads.
3.  Configure the environment variables based on `.env.example`.
4.  Deploy using the provided `Dockerfile`.
5.  Generate a secure JWT secret: `openssl rand -base64 64`

### Required Environment Variables
*   `DATABASE_URL` or `BELEDIYE_DB_URL`
*   `DB_USERNAME` and `DB_PASSWORD`
*   `JWT_SECRET`
*   `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
*   `APP_PUBLIC_URL`

## Development Setup

1.  Clone the repository.
2.  Copy environment templates (never commit real `.env` files):
    *   Backend: `cp .env.example .env` and set `DB_PASSWORD`, `JWT_SECRET` (`openssl rand -base64 64`).
    *   Alternatively: `cp src/main/resources/application-dev.properties.example src/main/resources/application-dev.properties`
    *   Citizen app: `cp belediyehattı/.env.example belediyehattı/.env`
    *   Admin portal: `cp admin-portal/.env.example admin-portal/.env`
    *   Public site: `cp public-site/.env.example public-site/.env`
3.  Ensure PostgreSQL is running (Docker or local install).
4.  Run `mvn spring-boot:run -Dspring-boot.run.profiles=dev`.
5.  Dev profilde süper admin (dev-migration): `admin@kentiva.app` / `admin123` — production'da bu hesap otomatik oluşturulmaz; kurulum sihirbazı kullanın.

### Secrets & deployment

*   **Yayınlama rehberi (TR):** [`deployment/YAYINLAMA.md`](deployment/YAYINLAMA.md) — Railway, Vercel, APK, süper admin `/setup`.
*   **Yerel manuel test (ngrok, APK en sonda):** [`scripts/YEREL-MANUEL-TEST.md`](scripts/YEREL-MANUEL-TEST.md) — `start-local.ps1` → doğrula → `build-apk-local.ps1`.
*   **Tüm anahtarlar (şablon):** [`deployment/ANAHTARLAR.template.env`](deployment/ANAHTARLAR.template.env) → kopyalayın: `deployment/ANAHTARLAR.local.env` (gitignore).
*   All API keys, DB passwords, and JWT secrets live in environment variables only (see `.env.example`, `railway.env.example`).
*   Do not commit `railway.env` or real keys. If a key was ever committed, rotate it immediately in Google Cloud / Railway.

## License

This is a proprietary B2B platform. All rights reserved.
