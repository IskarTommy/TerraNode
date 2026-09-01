import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';


const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(frontendDir, '../backend');

export default defineConfig({
  testDir: './tests-live',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-live' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-live-stack',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      name: 'django',
      command: 'pipenv run python run_e2e_server.py',
      cwd: backendDir,
      env: {
        DJANGO_SETTINGS_MODULE: 'config.settings.e2e',
        DJANGO_SECRET_KEY: 'e2e-only-secret-key-with-more-than-thirty-two-random-looking-characters',
        TELEMETRY_ENCRYPTION_KEY_V1: 'MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=',
        E2E_DATABASE_PATH: path.join(backendDir, '.e2e.sqlite3'),
        E2E_RESET_DATABASE: '1',
        E2E_SERVER_ADDRESS: '127.0.0.1:8001',
        E2E_ADMIN_EMAIL: 'e2e-admin@example.test',
        E2E_ADMIN_PASSWORD: 'E2EAdminPass123!',
        PIPENV_DONT_LOAD_ENV: '1',
        PYTHONUNBUFFERED: '1',
      },
      url: 'http://127.0.0.1:8001/healthz/',
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
    },
    {
      name: 'vite',
      command: 'pnpm dev --host 127.0.0.1 --port 4174',
      cwd: frontendDir,
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:8001/api/v1',
        VITE_DEMO_MODE: 'false',
        VITE_SUI_PACKAGE_ID: '',
      },
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
