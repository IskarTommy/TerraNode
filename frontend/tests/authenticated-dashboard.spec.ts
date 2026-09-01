import { expect, test } from '@playwright/test';

const farmer = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'farmer@example.com',
  full_name: 'Ama Farmer',
  role: 'FARMER',
  sui_public_key: null,
};

test('authenticated farmer dashboard renders API data without demo substitution', async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem('terranode_access', 'browser-test-access');
    localStorage.setItem('terranode_refresh', 'browser-test-refresh');
    localStorage.setItem('terranode_user', JSON.stringify(user));
  }, farmer);

  const authorizedRequests: string[] = [];
  await page.route('http://localhost:8000/api/v1/**', async (route) => {
    const request = route.request();
    if (request.headers().authorization === 'Bearer browser-test-access') {
      authorizedRequests.push(request.url());
    }
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/ledger/list/')) {
      await route.fulfill({
        json: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              farmer: farmer.id,
              current_custodian: farmer.id,
              origin_telemetry: null,
              crop_type: 'Maize',
              weight_kg: '12.500',
              weight_grams: 12500,
              status: 'MINTED',
              data_integrity_hash: 'ab'.repeat(32),
              sui_object_id: '0x' + '33'.repeat(32),
              sui_tx_digest: 'real-test-digest',
              transfers: [],
              created_at: '2026-09-01T08:00:00Z',
              updated_at: '2026-09-01T08:00:00Z',
            },
          ],
        },
      });
      return;
    }
    if (pathname.endsWith('/telemetry/latest/')) {
      await route.fulfill({
        json: {
          id: '33333333-3333-4333-8333-333333333333',
          farmer: farmer.id,
          recorded_at: '2026-09-01T07:00:00Z',
          temperature_celsius: 27.5,
          soil_moisture_percentage: 58,
          soil_ph: null,
          payload_sha256: 'cd'.repeat(32),
          provenance: null,
        },
      });
      return;
    }
    await route.fulfill({ status: 404, json: { detail: 'Not found in browser contract test.' } });
  });

  await page.goto('/farmer/dashboard');

  await expect(page.getByRole('heading', { name: 'Farmer Dashboard' })).toBeVisible();
  await expect(page.getByText('Live TerraNode data only.')).toBeVisible();
  await expect(page.getByText('Total batches').locator('..')).toContainText('1');
  await expect(page.getByText('Verified mints').locator('..')).toContainText('1');
  await expect(page.getByText('Latest temperature').locator('..')).toContainText('27.5');
  await expect(page.getByText(/DEMO DATA MODE/)).toHaveCount(0);
  expect(new Set(authorizedRequests)).toEqual(new Set([
    'http://localhost:8000/api/v1/ledger/list/?page_size=100',
    'http://localhost:8000/api/v1/telemetry/latest/',
  ]));
});

test('protected dashboard redirects an unauthenticated browser to login', async ({ page }) => {
  await page.goto('/farmer/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
