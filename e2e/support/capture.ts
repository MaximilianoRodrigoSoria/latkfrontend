import { type Page, type TestInfo } from '@playwright/test';
import path from 'node:path';

/** Las capturas quedan en e2e/screenshots/<proyecto>/<nombre>.png (y adjuntas al reporte). */
const ROOT = path.resolve(import.meta.dirname, '..', 'screenshots');

/**
 * Espera a que la pantalla este quieta (sin pedidos pendientes, sin esqueletos de carga ni
 * animaciones) y saca la captura de pagina completa.
 */
export async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page
    .locator('.mantine-Skeleton-root')
    .first()
    .waitFor({ state: 'detached', timeout: 10_000 })
    .catch(() => undefined);
  await closeToasts(page);
  // Graficos y transiciones de Mantine.
  await page.waitForTimeout(500);

  const file = path.join(ROOT, testInfo.project.name, `${name}.png`);
  // Pagina completa agrandando la ventana al alto del contenido (no `fullPage`): asi la barra
  // inferior y el encabezado fijos quedan en su lugar y los menus flotantes no se desacomodan.
  const viewport = page.viewportSize();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  if (viewport && height > viewport.height) {
    await page.setViewportSize({ width: viewport.width, height });
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: file, animations: 'disabled', caret: 'hide' });
  if (viewport) await page.setViewportSize(viewport);
  await testInfo.attach(name, { path: file, contentType: 'image/png' });
}

/** Cierra los avisos emergentes (por ejemplo "Tenés N sin leer") para que no tapen la pantalla. */
export async function closeToasts(page: Page): Promise<void> {
  const toasts = page.locator('.mantine-Notification-root .mantine-Notification-closeButton');
  for (let i = await toasts.count(); i > 0; i--) {
    await toasts
      .first()
      .click({ timeout: 2_000 })
      .catch(() => undefined);
  }
  await page
    .locator('.mantine-Notification-root')
    .first()
    .waitFor({ state: 'detached', timeout: 3_000 })
    .catch(() => undefined);
}
