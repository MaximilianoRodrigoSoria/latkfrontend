import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas E2E y capturas de pantalla de L.A TK.
 *
 * Corren contra la app real (Vite en modo "capturas", sin marca de agua ni bloqueo de capturas) y
 * el backend local con los datos de prueba (`app.demo-data.enabled=true`). Las credenciales se
 * leen de variables de entorno: nunca se escriben en el repo. Ver e2e/README.md.
 */
const PORT = Number(process.env.E2E_PORT ?? 5173);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './e2e/.results',
  // Los datos de prueba se comparten (un solo backend): en serie para que sea determinista.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: 'e2e/.report', open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  projects: [
    // Mobile-first: la app se usa sobre todo desde el celular.
    { name: 'celular', use: { ...devices['Pixel 7'] } },
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 } },
    },
  ],
  webServer: {
    command: `npm run local -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
