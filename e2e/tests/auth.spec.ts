import { expect, test } from '@playwright/test';
import { capture } from '../support/capture';
import { credentials } from '../support/session';

test.describe('ingreso', () => {
  test('sin sesión redirige al login', async ({ page }, info) => {
    await page.goto('/loans');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Usuario')).toBeVisible();
    await capture(page, info, '00-login');
  });

  test('contraseña incorrecta muestra el error y no entra', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Usuario').fill(credentials('seller').username);
    await page.getByLabel('Contrasena').fill('x'.repeat(12));
    await page.getByRole('button', { name: /ingresar/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
