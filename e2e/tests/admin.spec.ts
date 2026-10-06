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

  test('productos: todas las categorías con recargo y las ocultas marcadas', async ({
    page,
  }, info) => {
    await page.goto('/products');
    await expect(page.getByText(/^Recargo \+/).first()).toBeVisible();
    await expect(page.getByText('Oculta por defecto').first()).toBeVisible();
    await expect(page.getByText('Diamante', { exact: true })).toBeVisible();
    await capture(page, info, '05-admin-productos');

    await page.getByText('Administrar', { exact: true }).click();
    await expect(page.getByText('Habilitada por defecto para vendedores').first()).toBeVisible();
    await capture(page, info, '05b-admin-productos-administrar');
  });

  test('cuenta para rendiciones', async ({ page }, info) => {
    await page.goto('/settings/collection-account');
    await expect(page.getByRole('heading', { name: 'Cuenta para rendiciones' })).toBeVisible();
    await capture(page, info, '06-admin-cuenta-rendiciones');
  });

  test('configuración de créditos: francés o interés plano', async ({ page }, info) => {
    // Es una configuracion global: se prueba en un solo dispositivo para no cruzarse con otras
    // pruebas que corren en paralelo.
    test.skip(info.project.name !== 'escritorio', 'configuracion global');
    await page.goto('/settings/lending');
    await expect(page.getByRole('heading', { name: 'Configuración de créditos' })).toBeVisible();
    const flat = page.getByRole('radio', { name: 'Interés plano' });
    const french = page.getByRole('radio', { name: 'Amortización francesa' });
    // Se guarda al elegir: el estado cambia cuando responde el servidor.
    if (await flat.isChecked()) {
      await french.click();
      await expect(french).toBeChecked();
    }
    await flat.click();
    await expect(flat).toBeChecked();
    await expect(page.getByText('Créditos nuevos con Interés plano')).toBeVisible();
    await capture(page, info, '06b-admin-config-creditos');
    // Se deja como estaba.
    await french.click();
    await expect(french).toBeChecked();
  });

  test('productos: frecuencias nuevas en el formulario', async ({ page }) => {
    await page.goto('/products?nuevo=1');
    await page.getByRole('combobox', { name: 'Frecuencia de pago' }).click();
    for (const label of ['Diario', 'Catorcenal', 'Quincenal', 'Cada 28 días']) {
      await expect(page.getByRole('option', { name: label })).toBeVisible();
    }
  });

  test('tema', async ({ page }, info) => {
    await page.goto('/settings/theme');
    await expect(page.getByRole('heading', { name: 'Design system' })).toBeVisible();
    await capture(page, info, '07-admin-tema');
  });
});
