import { expect, test } from '@playwright/test';
import { capture } from '../support/capture';
import { login, requireCredentials } from '../support/session';

/** Recorrido del vendedor con datos de prueba: lo que ve y lo que NO tiene que ver. */
test.describe('vendedor', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'seller');
  });

  test('Inicio: ganancia del mes oculta, cobranza y objetivo', async ({ page }, info) => {
    await expect(page.getByText('Este mes podés ganar')).toBeVisible();
    await expect(page.getByLabel('Ganancia oculta')).toBeVisible();
    await expect(page.getByText('Te pagaron')).toBeVisible();
    await expect(page.getByText('A rendir')).toBeVisible();
    await expect(page.getByText(/^Tu objetivo de /)).toBeVisible();
    await capture(page, info, '01-inicio');
  });

  test('Inicio: revela la ganancia con la contraseña', async ({ page }, info) => {
    const { password } = requireCredentials('seller');
    await page.getByRole('button', { name: 'Ver', exact: true }).click();
    await page.getByRole('dialog').locator('input[type="password"]').fill(password);
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Ganancia oculta')).toBeHidden();
    await expect(page.getByText(/^Llevás ganado/)).toBeVisible();
    await capture(page, info, '02-inicio-ganancia');
  });

  test('menú de usuario: datos, contraseña e instalar', async ({ page }, info) => {
    await page.getByLabel('Menu de usuario').click();
    await expect(page.getByRole('menuitem', { name: 'Cambiar contraseña' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Mis datos' })).toBeVisible();
    await capture(page, info, '03-menu');
  });

  test('clientes y detalle con historial', async ({ page }, info) => {
    await page.goto('/customers');
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    const first = page.locator('a[href^="/customers/"]').first();
    await expect(first).toBeVisible();
    await capture(page, info, '04-clientes');

    await first.click();
    await expect(page).toHaveURL(/\/customers\/[\w-]+$/);
    await capture(page, info, '05-cliente-detalle');
  });

  test('préstamos y detalle con cuotas', async ({ page }, info) => {
    await page.goto('/loans');
    await expect(page.getByRole('heading', { name: 'Préstamos' })).toBeVisible();
    const first = page.locator('a[href^="/loans/"]:not([href="/loans/new"])').first();
    await expect(first).toBeVisible();
    await capture(page, info, '06-prestamos');

    await first.click();
    await expect(page).toHaveURL(/\/loans\/[\w-]+$/);
    await capture(page, info, '07-prestamo-detalle');
  });

  test('simulador sin tasa ni interés', async ({ page }, info) => {
    await page.goto('/simulator');
    await expect(page.getByRole('heading', { name: 'Simulador' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Producto' }).click();
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: 'Calcular' }).click();
    await expect(page.getByText('Total a devolver')).toBeVisible();
    // El vendedor no ve la tasa ni el interes (regla de negocio).
    await expect(page.getByText(/^Tasa /)).toHaveCount(0);
    await expect(page.getByText('Interes total')).toHaveCount(0);
    await capture(page, info, '08-simulador');
  });

  test('productos sin tasa', async ({ page }, info) => {
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
    await expect(page.getByText(/^Tasa /)).toHaveCount(0);
    await capture(page, info, '09-productos');
  });

  test('nuevo préstamo', async ({ page }, info) => {
    await page.goto('/loans/new');
    await expect(page.getByRole('heading', { name: 'Nuevo préstamo' })).toBeVisible();
    await capture(page, info, '10-nuevo-prestamo');
  });

  test('ganancias protegidas', async ({ page }, info) => {
    await page.goto('/earnings');
    await expect(page.getByText('Tus ganancias están ocultas')).toBeVisible();
    await capture(page, info, '11-ganancias');
  });

  test('notificaciones', async ({ page }, info) => {
    await page.getByRole('button', { name: /^Notificaciones/ }).click();
    await capture(page, info, '12-notificaciones');
  });

  test('cambiar contraseña: valida la confirmación', async ({ page }, info) => {
    await page.goto('/account/password');
    await page.getByLabel('Contraseña actual', { exact: true }).fill('a'.repeat(10));
    await page.getByLabel('Contraseña nueva', { exact: true }).fill('b'.repeat(10));
    await page.getByLabel('Repetí la contraseña nueva').fill('c'.repeat(10));
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();
    await capture(page, info, '13-cambiar-contrasena');
  });

  test('no entra a pantallas del admin', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Vendedores' })).toHaveCount(0);
    await page.goto('/sellers');
    await expect(page.getByRole('heading', { name: 'Vendedores' })).toHaveCount(0);
  });
});
