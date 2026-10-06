import { expect, type Page, test } from '@playwright/test';
import { capture } from '../support/capture';
import { requireCredentials } from '../support/session';

/** Ingresa desde la pantalla de login (con ?add=1 si la pestaña ya tiene una cuenta). */
async function signIn(page: Page, username: string, password: string, add = false) {
  await page.goto(add ? '/login?add=1' : '/login');
  await page.getByLabel('Usuario').fill(username);
  await page.getByLabel('Contrasena').fill(password);
  await page.getByRole('button', { name: /ingresar/i }).click();
  await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible();
}

/** El caso que se rompia: vendedor en una pestaña y admin en otra del MISMO navegador. */
test.describe('varias cuentas en el mismo navegador', () => {
  test('vendedor y admin en dos pestañas no se pisan', async ({ context }, info) => {
    const seller = requireCredentials('seller');
    const admin = requireCredentials('admin');

    const sellerTab = await context.newPage();
    await signIn(sellerTab, seller.username, seller.password);
    await expect(sellerTab.getByRole('heading', { name: 'Hola, Vendedor Demo' })).toBeVisible();

    const adminTab = await context.newPage();
    await signIn(adminTab, admin.username, admin.password, true);
    await expect(adminTab.getByRole('heading', { name: 'Hola, Administrador' })).toBeVisible();

    // Antes, al recargar, la pestaña del vendedor pasaba a ser del admin.
    await sellerTab.reload();
    await expect(sellerTab.getByRole('heading', { name: 'Hola, Vendedor Demo' })).toBeVisible();
    await adminTab.reload();
    await expect(adminTab.getByRole('heading', { name: 'Hola, Administrador' })).toBeVisible();

    // Desde el menu se cambia de cuenta solo en esa pestaña.
    await adminTab.getByLabel('Menu de usuario').click();
    await expect(adminTab.getByRole('menuitem', { name: /Vendedor Demo/ })).toBeVisible();
    await capture(adminTab, info, '14-cambiar-de-cuenta');
    await adminTab.getByRole('menuitem', { name: /Vendedor Demo/ }).click();
    await expect(adminTab.getByRole('heading', { name: 'Hola, Vendedor Demo' })).toBeVisible();
    await sellerTab.reload();
    await expect(sellerTab.getByRole('heading', { name: 'Hola, Vendedor Demo' })).toBeVisible();
  });

  test('el admin asigna categorías a un vendedor y él las ve al instante', async ({
    context,
  }, info) => {
    const admin = requireCredentials('admin');
    const seller = requireCredentials('seller');
    // vendedor2 (Lucia Fernandez): no lo usan las demas pruebas, asi que se puede modificar.
    const sellerTwo = process.env.E2E_SELLER2_USER ?? 'vendedor2';

    const adminTab = await context.newPage();
    await signIn(adminTab, admin.username, admin.password);
    await adminTab.goto('/sellers');
    await adminTab.getByText('Lucia Fernandez').first().click();
    const card = adminTab.getByText('Categorías que puede ofrecer');
    await expect(card).toBeVisible();

    // Solo Hierro y Platino (Platino esta oculta por defecto).
    for (const tier of ['Bronce', 'Plata', 'Oro']) {
      await adminTab.getByRole('checkbox', { name: `Categoría ${tier}` }).uncheck();
    }
    await adminTab.getByRole('checkbox', { name: 'Categoría Platino' }).check();
    await adminTab.getByRole('button', { name: 'Guardar categorías' }).click();
    await expect(adminTab.getByText('Asignadas', { exact: true })).toBeVisible();
    await capture(adminTab, info, '15-admin-categorias-vendedor');

    const sellerTab = await context.newPage();
    await signIn(sellerTab, sellerTwo, seller.password, true);
    await sellerTab.goto('/loans/new');
    await expect(sellerTab.getByRole('button', { name: 'Categoría Hierro' })).toBeVisible();
    await expect(sellerTab.getByRole('button', { name: 'Categoría Platino' })).toBeVisible();
    await expect(sellerTab.getByRole('button', { name: 'Categoría Oro' })).toHaveCount(0);
    await capture(sellerTab, info, '16-vendedor-categorias-asignadas');

    // Se deja como estaba: vuelve a las categorias por defecto.
    await adminTab.reload();
    await adminTab.getByRole('button', { name: 'Volver a las por defecto' }).click();
    await expect(adminTab.getByText('Por defecto', { exact: true })).toBeVisible();
  });
});
