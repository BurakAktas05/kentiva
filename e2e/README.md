# Kentiva Playwright smoke

Kritik kullanıcı akışları için iskelet E2E suite.

## Kurulum

```bash
cd e2e
npm install
npx playwright install chromium
```

## Çalıştırma

Ortam değişkenleri olmadan testler **atlanır** (fail etmez).

```powershell
$env:E2E_API_URL="http://localhost:8080/api/v1"
$env:E2E_CITIZEN_URL="http://localhost:3000"
$env:E2E_ADMIN_URL="http://localhost:5173"
$env:E2E_CITIZEN_EMAIL="citizen@example.com"
$env:E2E_CITIZEN_PASSWORD="..."
$env:E2E_ADMIN_EMAIL="admin@example.com"
$env:E2E_ADMIN_PASSWORD="..."
$env:E2E_CATEGORY_ID="..."
$env:E2E_MUNICIPALITY_ID="..."
npm test
```

## Kapsanan akış

1. Vatandaş API login
2. İhbar oluşturma
3. Admin listede görme (`q` araması)
4. Durum güncelleme
5. Vatandaşın güncel durumu görmesi
6. (Opsiyonel) cross-tenant engeli
