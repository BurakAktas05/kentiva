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
2.  Ensure Docker is running for local PostgreSQL (optional, can use local install).
3.  Run `mvn spring-boot:run -Dspring-boot.run.profiles=dev`.
4.  The default super-admin credentials (if using the seed data) are `admin@kentiva.app` / `admin123`.

## License

This is a proprietary B2B platform. All rights reserved.
