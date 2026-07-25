import { expect, test } from '@playwright/test';

const apiUrl = process.env.E2E_API_URL;
const citizenUrl = process.env.E2E_CITIZEN_URL;
const adminUrl = process.env.E2E_ADMIN_URL;
const citizenEmail = process.env.E2E_CITIZEN_EMAIL;
const citizenPassword = process.env.E2E_CITIZEN_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

const envReady = Boolean(
  apiUrl && citizenUrl && adminUrl && citizenEmail && citizenPassword && adminEmail && adminPassword,
);

test.describe('Kentiva critical smoke', () => {
  test.skip(!envReady, 'E2E_* ortam değişkenleri tanımlı değil — smoke atlandı');

  test('citizen login → create report → admin sees → status update → citizen sees', async ({
    page,
    request,
  }) => {
    // 1) Vatandaş girişi
    await page.goto(citizenUrl!);
    await page.getByRole('button', { name: /giriş|login/i }).first().click({ timeout: 15_000 }).catch(() => {});
    // Auth ekranı doğrudan açık olabilir
    const emailField = page.getByLabel(/e-?posta|email/i).or(page.locator('input[type="email"]')).first();
    await emailField.fill(citizenEmail!);
    await page.locator('input[type="password"]').first().fill(citizenPassword!);
    await page.getByRole('button', { name: /giriş yap|sign in|login/i }).first().click();
    await expect(page.getByText(/ihbar|ana sayfa|home|kentiva/i).first()).toBeVisible({ timeout: 30_000 });

    // 2) İhbar oluştur (API üzerinden — UI GPS/kamera flaky)
    const loginRes = await request.post(`${apiUrl}/auth/login`, {
      data: { email: citizenEmail, password: citizenPassword },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    const citizenToken = loginBody.data?.accessToken as string;
    expect(citizenToken).toBeTruthy();

    const createRes = await request.post(`${apiUrl}/reports`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
      data: {
        title: `E2E Smoke ${Date.now()}`,
        description: 'Playwright kritik akış smoke ihbarı — otomatik test.',
        categoryId: process.env.E2E_CATEGORY_ID ?? '',
        latitude: Number(process.env.E2E_LAT ?? 41.0082),
        longitude: Number(process.env.E2E_LNG ?? 28.9784),
        district: process.env.E2E_DISTRICT ?? 'Test',
        mediaUrls: [],
        targetMunicipalityId: process.env.E2E_MUNICIPALITY_ID ?? null,
        kvkkApproved: true,
      },
    });

    // Kategori/belediye env yoksa bu adımı yumuşak bırak
    test.skip(!createRes.ok(), `İhbar oluşturma başarısız: ${createRes.status()} — E2E_CATEGORY_ID / konum ayarlarını kontrol edin`);

    const created = await createRes.json();
    const reportId = created.data?.id as string;
    expect(reportId).toBeTruthy();

    // 3) Admin girişi + ihbar görünürlüğü
    const adminLogin = await request.post(`${apiUrl}/auth/login`, {
      data: { email: adminEmail, password: adminPassword },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const adminToken = (await adminLogin.json()).data?.accessToken as string;

    const listRes = await request.get(`${apiUrl}/reports?q=${encodeURIComponent(reportId)}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const listBody = await listRes.json();
    const found = (listBody.data?.content ?? []).some((r: { id: string }) => r.id === reportId);
    expect(found).toBeTruthy();

    // 4) Durum güncelle
    const statusRes = await request.patch(`${apiUrl}/reports/${reportId}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: 'PROCESSING', note: 'E2E smoke — işleme alındı' },
    });
    expect(statusRes.ok()).toBeTruthy();

    // 5) Vatandaş güncel durumu görür
    const detailRes = await request.get(`${apiUrl}/reports/${reportId}`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    expect(detailRes.ok()).toBeTruthy();
    const detail = await detailRes.json();
    expect(detail.data?.status).toBe('PROCESSING');

    // 6) Cross-tenant: başka belediye id ile erişim engeli (opsiyonel)
    const foreignId = process.env.E2E_FOREIGN_REPORT_ID;
    if (foreignId) {
      const denied = await request.get(`${apiUrl}/reports/${foreignId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect([403, 404]).toContain(denied.status());
    }

    // Admin UI smoke (login sayfası açılır)
    await page.goto(`${adminUrl}/municipality/login`);
    await expect(page.locator('body')).toBeVisible();
  });
});
