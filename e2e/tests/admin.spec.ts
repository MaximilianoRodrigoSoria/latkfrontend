import { expect, test } from '@playwright/test';
import { capture } from '../support/capture';
import { login } from '../support/session';

/** Recorrido del administrador: cartera completa, vendedores, cupos y configuracion. */
test.describe('administrador', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
  });

  test('Inicio con la cobranza del mes y estadísticas', async ({ page }, info) => {
    await expect(page.getByText(/^Este mes ·/)).toBeVisible();
    await expect(page.getByText('Cobrado este mes')).toBeVisible();
    // La ganancia del vendedor no aplica al admin.
    await expect(page.getByText('Este mes podés ganar')).toHaveCount(0);
    await expect(page.getByText('Por vendedor')).toBeVisible();
    await capture(page, info, '01-admin-inicio');
  });

  test('préstamos de toda la cartera', async ({ page }, info) => {
    await page.goto('/loans');
    await expect(page.locator('a[href^="/loans/"]').first()).toBeVisible();
    await capture(page, info, '02-admin-prestamos');
  });

  test('vendedores y detalle con cupo mensual', async ({ page }, info) => {
    await page.goto('/sellers');
    await expect(page.getByRole('heading', { name: 'Vendedores' })).toBeVisible();
    await capture(page, info, '03-admin-vendedores');

    await page.locator('a[href^="/sellers/"]').first().click();
    await expect(page.getByText('Cupo mensual')).toBeVisible();
    await capture(page, info, '04-admin-vendedor-detalle');
  });

  test('productos con tasa', async ({ page }, info) => {
    await page.goto('/products');
    await expect(page.getByText(/^Tasa /).first()).toBeVisible();
    await capture(page, info, '05-admin-productos');
  });

  test('cuenta para rendiciones', async ({ page }, info) => {
    await page.goto('/settings/collection-account');
    await expect(page.getByRole('heading', { name: 'Cuenta para rendiciones' })).toBeVisible();
    await capture(page, info, '06-admin-cuenta-rendiciones');
  });

  test('tema', async ({ page }, info) => {
    await page.goto('/settings/theme');
    await expect(page.getByRole('heading', { name: 'Design system' })).toBeVisible();
    await capture(page, info, '07-admin-tema');
  });
});
