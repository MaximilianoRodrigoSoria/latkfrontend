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

  test('cargos opcionales: papelería', async ({ page }, info) => {
    test.skip(info.project.name !== 'escritorio', 'configuracion global');
    await page.goto('/settings/lending');
    const paperwork = page.getByRole('switch', { name: /Cobrar papelería/ });
    await expect(paperwork).not.toBeChecked();
    await paperwork.click();
    await page.getByLabel('Papelería', { exact: true }).fill('1500');
    await page.getByRole('button', { name: 'Guardar cargos' }).click();
    await page.reload();
    await expect(page.getByRole('switch', { name: /Cobrar papelería/ })).toBeChecked();
    await capture(page, info, '06c-admin-cargos');
    // Se deja como estaba.
    await page.getByRole('switch', { name: /Cobrar papelería/ }).click();
    await page.getByRole('button', { name: 'Guardar cargos' }).click();
    await page.reload();
    await expect(page.getByRole('switch', { name: /Cobrar papelería/ })).not.toBeChecked();
  });

  test('aumento: se pide, se aprueba y se transfiere', async ({ page, browser }, info) => {
    test.skip(info.project.name !== 'escritorio', 'modifica un prestamo');
    const sellerContext = await browser.newContext({ baseURL: info.project.use.baseURL });
    const seller = await sellerContext.newPage();
    await login(seller, 'seller');
    await seller.goto('/loans?status=DISBURSED');
    await seller.locator('a[href^="/loans/"]:not([href="/loans/new"])').first().click();
    const loanUrl = seller.url();
    await seller.getByRole('button', { name: 'Más acciones' }).click();
    await seller.getByRole('menuitem', { name: 'Pedir aumento' }).click();
    await seller.getByLabel('¿Cuántas cuotas querés agregar?').fill('1');
    await expect(seller.getByText(/El cliente recibe .* más/)).toBeVisible();
    await seller.getByRole('button', { name: 'Pedir aumento' }).click();
    await expect(seller.getByText('Aumento pendiente de aprobación')).toBeVisible();
    await sellerContext.close();

    // El admin lo aprueba: queda esperando la transferencia, sin cuotas nuevas todavia.
    await page.goto(new URL(loanUrl).pathname);
    await expect(page.getByText('Aumento pendiente de aprobación')).toBeVisible();
    await capture(page, info, '06d-admin-aumento-pendiente');
    const cuotas = page.getByText(/^\d+ de \d+ cobradas$/);
    const before = await cuotas.textContent();
    await page.getByRole('button', { name: 'Aprobar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Aprobar' }).click();
    await expect(page.getByText(/^Aumento aprobado: falta transferir/)).toBeVisible();
    await expect(cuotas).toHaveText(before ?? '');

    // Al registrar la transferencia se agrega la cuota.
    await page.getByLabel('Comprobante (opcional)').fill('E2E 1');
    await page.getByRole('button', { name: 'Registrar transferencia del aumento' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(/^Aumento aprobado: falta transferir/)).toHaveCount(0);
    await expect(cuotas).not.toHaveText(before ?? '');
    await page.getByRole('button', { name: /^Aumentos/ }).click();
    await expect(page.getByText('Transferido').first()).toBeVisible();
  });

  test('fijar cuota de una categoría', async ({ page }, info) => {
    test.skip(info.project.name !== 'escritorio', 'configuracion global');
    await page.goto('/products');
    await page.getByText('Administrar', { exact: true }).click();
    const card = page.locator('.mantine-Card-root').filter({ hasText: 'Hierro' }).first();
    await card.getByRole('button', { name: /^(Fijar cuota|Editar cuota fija)$/ }).click();
    const dialog = page.getByRole('dialog');
    const inputs = dialog.getByRole('textbox', { name: /^Cuota cada \$10\.000 en \d+ cuotas$/ });
    const count = await inputs.count();
    for (let i = 0; i < count; i++) await inputs.nth(i).fill('5000');
    await expect(dialog.getByText(/ %$/).first()).toBeVisible();
    await capture(page, info, '06f-admin-fijar-cuota');
    await dialog.getByRole('button', { name: 'Guardar' }).click();
    await expect(card.getByText(/· cuota fija$/)).toBeVisible();
    // Se deja como estaba.
    await card.getByRole('button', { name: 'Editar cuota fija' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Quitar cuota fija' }).click();
    await expect(card.getByText(/· cuota fija$/)).toHaveCount(0);
  });

  test('saldar préstamo muestra el total a cobrar', async ({ page }) => {
    await page.goto('/loans?status=DISBURSED');
    await page.locator('a[href^="/loans/"]:not([href="/loans/new"])').first().click();
    await page.getByRole('button', { name: 'Más acciones' }).click();
    await page.getByRole('menuitem', { name: 'Saldar préstamo' }).click();
    await expect(page.getByText(/^Total a cobrar: \$/)).toBeVisible();
    await page.getByRole('button', { name: 'Volver' }).click();
  });

  test('respaldo de datos: descarga el ZIP', async ({ page }, info) => {
    await page.goto('/settings/backup');
    await expect(page.getByRole('heading', { name: 'Respaldo de datos' })).toBeVisible();
    await capture(page, info, '06e-admin-respaldo');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar respaldo' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  });

  test('tema', async ({ page }, info) => {
    await page.goto('/settings/theme');
    await expect(page.getByRole('heading', { name: 'Design system' })).toBeVisible();
    await capture(page, info, '07-admin-tema');
  });
});
