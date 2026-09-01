import { expect, test } from '@playwright/test';


test('real farmer, public verification, logistics, and admin flow', async ({ page, request }) => {
  const email = `live-farmer-${Date.now()}@example.test`;
  const logisticsEmail = `live-logistics-${Date.now()}@example.test`;
  const password = 'LiveStackPass123!';
  const adminEmail = 'e2e-admin@example.test';
  const adminPassword = 'E2EAdminPass123!';
  const apiResponses: Array<{ method: string; path: string; status: number }> = [];

  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === 'http://127.0.0.1:8001' && url.pathname.startsWith('/api/v1/')) {
      apiResponses.push({
        method: response.request().method(),
        path: url.pathname,
        status: response.status(),
      });
    }
  });

  await page.goto('/register');
  await page.getByLabel('Full name').fill('Live Stack Farmer');
  await page.getByLabel('Email address').fill(email);
  await page.locator('#password').fill(password);
  await page.getByLabel('Role').selectOption('FARMER');
  await page.getByRole('checkbox').check();

  await Promise.all([
    page.waitForResponse((response) => (
      response.url().endsWith('/api/v1/auth/register/')
      && response.status() === 201
    )),
    page.getByRole('button', { name: 'Create Account' }).click(),
  ]);

  await expect(page).toHaveURL(/\/farmer\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Farmer Dashboard' })).toBeVisible();
  await expect(page.getByText('No operational data yet. No demo data was substituted.')).toBeVisible();
  await expect(page.getByText(/DEMO DATA MODE/)).toHaveCount(0);

  const tokens = await page.evaluate(() => ({
    access: localStorage.getItem('terranode_access'),
    refresh: localStorage.getItem('terranode_refresh'),
  }));
  expect(tokens.access).toBeTruthy();
  expect(tokens.refresh).toBeTruthy();

  await page.getByRole('link', { name: 'Telemetry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Telemetry' })).toBeVisible();
  await expect(page.getByText('No genuine observations are stored. No chart samples were substituted.')).toBeVisible();
  await page.getByRole('button', { name: 'Record observation' }).click();
  await page.getByLabel(/Temperature/).fill('26.5');
  await page.getByLabel(/Soil moisture/).fill('58.25');
  await page.getByLabel(/Soil pH/).fill('6.45');

  await Promise.all([
    page.waitForResponse((response) => (
      response.url().endsWith('/api/v1/telemetry/submit/')
      && response.status() === 201
    )),
    page.getByRole('button', { name: 'Encrypt and save' }).click(),
  ]);

  await expect(page.getByRole('status')).toContainText(
    'Encrypted telemetry stored and integrity hash verified.',
  );
  await expect(page.getByText(/^26[.]5 \u00B0C$/)).toBeVisible();
  await expect(page.getByText('58.3 %', { exact: true })).toBeVisible();
  await expect(page.getByText('6.45', { exact: true })).toBeVisible();
  await expect(page.getByText('MANUAL', { exact: true })).toBeVisible();

  const historyResponse = await request.get(
    'http://127.0.0.1:8001/api/v1/telemetry/history/',
    { headers: { Authorization: `Bearer ${tokens.access}` } },
  );
  expect(historyResponse.status()).toBe(200);
  const history = await historyResponse.json();
  expect(history.count).toBe(1);
  expect(history.results[0]).toMatchObject({
    temperature_celsius: 26.5,
    soil_moisture_percentage: 58.25,
    soil_ph: 6.45,
    source_type: 'MANUAL',
    schema_version: 1,
    key_version: 1,
  });
  expect(history.results[0].payload_sha256).toMatch(/^[0-9a-f]{64}$/);

  const prepareResponse = await request.post(
    'http://127.0.0.1:8001/api/v1/ledger/prepare/',
    {
      headers: { Authorization: 'Bearer ' + tokens.access },
      data: {
        crop_type: 'MAIZE',
        weight_kg: 12.345,
        origin_telemetry: history.results[0].id,
      },
    },
  );
  expect(prepareResponse.status()).toBe(201);
  const batch = await prepareResponse.json();
  expect(batch.status).toBe('PENDING');
  expect(batch.data_integrity_hash).toBe(history.results[0].payload_sha256);

  await page.evaluate(() => localStorage.clear());
  await page.goto('/verify');
  await page.getByLabel('Batch UUID or Sui object ID').fill(batch.id);
  const verificationResponsePromise = page.waitForResponse((response) => (
    response.url().endsWith('/api/v1/ledger/verify/' + batch.id + '/')
    && response.status() === 200
  ));
  await page.getByRole('button', { name: 'Verify batch' }).click();
  const verificationResponse = await verificationResponsePromise;
  expect(verificationResponse.request().headers().authorization).toBeUndefined();
  await expect(page.getByRole('status')).toHaveText('NOT VERIFIED');
  await expect(page.getByText('Local telemetry integrity').locator('..').getByText('PASS')).toBeVisible();
  await expect(page.getByText('Batch hash link').locator('..').getByText('PASS')).toBeVisible();
  await expect(page.getByText('Sui mint transaction').locator('..').getByText('FAIL')).toBeVisible();
  await expect(page.getByText('Custody chain and owner').locator('..').getByText('PASS')).toBeVisible();
  await expect(page.getByText(batch.id, { exact: true })).toBeVisible();

  await page.goto('/register');
  await page.getByLabel('Full name').fill('Live Stack Logistics');
  await page.getByLabel('Email address').fill(logisticsEmail);
  await page.locator('#password').fill(password);
  await page.getByLabel('Role').selectOption('LOGISTICS');
  await page.getByRole('checkbox').check();
  await Promise.all([
    page.waitForResponse((response) => (
      response.url().endsWith('/api/v1/auth/register/')
      && response.status() === 201
    )),
    page.getByRole('button', { name: 'Create Account' }).click(),
  ]);
  await expect(page).toHaveURL(/\/logistics\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Logistics Dashboard' })).toBeVisible();
  await expect(page.getByText('No custody records. No demo shipments were substituted.')).toBeVisible();

  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await page.locator('#email').fill(adminEmail);
  await page.locator('#password').fill(adminPassword);
  const adminStatsPromise = page.waitForResponse((response) => (
    response.url().endsWith('/api/v1/analytics/admin-stats/')
    && response.status() === 200
  ));
  await page.getByRole('button', { name: 'Sign In' }).click();
  const adminStatsResponse = await adminStatsPromise;
  const adminStats = await adminStatsResponse.json();
  expect(adminStats).toMatchObject({
    total_users: 3,
    total_farmers: 1,
    total_logistics: 1,
    total_admins: 1,
    total_batches: 1,
    pending_batches: 1,
    telemetry_records: 1,
  });
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible();

  const usersResponsePromise = page.waitForResponse((response) => (
    response.url().includes('/api/v1/auth/users/')
    && response.status() === 200
  ));
  await page.getByRole('link', { name: 'Users', exact: true }).click();
  const usersResponse = await usersResponsePromise;
  const users = await usersResponse.json();
  expect(users.count).toBe(3);
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(page.getByText(logisticsEmail, { exact: true })).toBeVisible();
  await expect(page.getByText(adminEmail, { exact: true })).toBeVisible();

  const auditResponsePromise = page.waitForResponse((response) => (
    response.url().includes('/api/v1/analytics/audit-logs/')
    && response.status() === 200
  ));
  await page.getByRole('link', { name: 'Audit Logs', exact: true }).click();
  const auditResponse = await auditResponsePromise;
  const audit = await auditResponse.json();
  expect(audit.results.some((entry: { event_type: string }) => entry.event_type === 'BATCH_PREPARE')).toBe(true);
  await expect(page.getByText('BATCH_PREPARE', { exact: true })).toBeVisible();

  const healthResponsePromise = page.waitForResponse((response) => (
    response.url().endsWith('/api/v1/analytics/health/')
    && response.status() === 200
  ));
  await page.getByRole('link', { name: 'System Health', exact: true }).click();
  const healthResponse = await healthResponsePromise;
  expect(await healthResponse.json()).toMatchObject({
    database: 'healthy',
    redis: 'degraded',
    celery_workers: 'degraded',
    blockchain: 'degraded',
  });
  await expect(page.getByRole('heading', { name: 'System Health' })).toBeVisible();

  expect(apiResponses).toEqual(expect.arrayContaining([
    { method: 'POST', path: '/api/v1/auth/register/', status: 201 },
    { method: 'POST', path: '/api/v1/auth/login/', status: 200 },
    { method: 'POST', path: '/api/v1/telemetry/submit/', status: 201 },
    { method: 'GET', path: '/api/v1/telemetry/history/', status: 200 },
    { method: 'GET', path: '/api/v1/ledger/verify/' + batch.id + '/', status: 200 },
  ]));
});
