import { defineConfig, devices } from '@playwright/test';

/**
 * Kritik akış smoke iskeleti.
 * Ortam değişkenleri yoksa testler atlanır (CI'da isteğe bağlı çalıştırılır).
 *
 * Gerekli env:
 * - E2E_API_URL (örn. http://localhost:8080/api/v1)
 * - E2E_CITIZEN_URL (örn. http://localhost:3000)
 * - E2E_ADMIN_URL (örn. http://localhost:5173)
 * - E2E_CITIZEN_EMAIL / E2E_CITIZEN_PASSWORD
 * - E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 */
const apiUrl = process.env.E2E_API_URL ?? '';
const citizenUrl = process.env.E2E_CITIZEN_URL ?? '';
const adminUrl = process.env.E2E_ADMIN_URL ?? '';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  metadata: {
    apiUrl,
    citizenUrl,
    adminUrl,
  },
});
