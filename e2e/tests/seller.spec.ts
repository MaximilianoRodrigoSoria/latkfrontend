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

  test('ficha del cliente: cómo paga, notas y referencias plegables', async ({ page }, info) => {
    await page.goto('/customers');
    await page.locator('a[href^="/customers/"]').first().click();
    await expect(page).toHaveURL(/\/customers\/[\w-]+$/);

    // Plegadas: se ve el titulo y el dato breve, el detalle al tocar.
    const behavior = page.getByRole('button', { name: /Cómo paga/ });
    await expect(behavior).toContainText(/Puntual|Regular|Riesgoso|Sin historial/);
    await behavior.click();
    await expect(page.getByText(/cuotas a tiempo|Todavía no venció/)).toBeVisible();

    await page.getByRole('button', { name: /^Notas/ }).click();
    const note = `Paga los viernes ${Date.now()}`;
    await page.getByPlaceholder('Ej.: paga los viernes, cambió de domicilio').fill(note);
    await page.getByRole('button', { name: 'Agregar nota' }).click();
    await expect(page.getByText(note)).toBeVisible();

    await page.getByRole('button', { name: /^Referencias/ }).click();
    await page.getByRole('button', { name: 'Agregar referencia' }).click();
    await page.getByLabel('Nombre', { exact: true }).fill('Ana Referencia');
    await page.getByLabel('Vínculo').fill('Hermana');
    await page.getByLabel('Teléfono').fill('11 5555-1234');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Ana Referencia')).toBeVisible();
    await capture(page, info, '05b-cliente-notas-referencias');

    // Se deja como estaba.
    await page.getByRole('button', { name: 'Quitar a Ana Referencia' }).click();
    await expect(page.getByText('Ana Referencia')).toHaveCount(0);
  });

  test('cuotas con puntualidad e historial plegado', async ({ page }, info) => {
    await page.goto('/loans?status=DISBURSED');
    // Un prestamo con al menos una cuota cobrada.
    await page
      .locator('a[href^="/loans/"]:not([href="/loans/new"])')
      .filter({ has: page.getByText(/^[1-9]\d*\/\d+ cobradas/) })
      .first()
      .click();
    await expect(page.getByText(/^Cobrada (a tiempo|\d+ días? tarde)$/).first()).toBeVisible();
    const history = page.getByRole('button', { name: /Historial de cobros/ });
    await expect(history).toHaveAttribute('aria-expanded', 'false');
    await history.click();
    await expect(page.getByText(/^Cuota \d+ cobrada/).first()).toBeVisible();
    await capture(page, info, '07c-cuotas-puntualidad');
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

  test('cobranza del día: chip de estado, cobrar hoy y para renovar', async ({ page }, info) => {
    // Inicio avisa la cobranza del dia y lleva a la lista filtrada.
    await expect(page.getByText('Cobranza de hoy')).toBeVisible();
    await page.getByRole('link', { name: 'Ver a quién cobrar' }).click();
    await expect(page).toHaveURL(/status=TODAY/);
    await expect(page.getByText(/^Cobrar hoy \(\d+\)$/)).toBeVisible();
    // Cada tarjeta tiene un solo chip de cobro: atrasado o para hoy.
    const cards = page.locator('a[href^="/loans/"]:not([href="/loans/new"])');
    await expect(cards.first()).toBeVisible();
    await expect(cards.first().getByText(/^(Atrasado \d+ días?|Cobrar hoy)$/)).toHaveCount(1);
    await capture(page, info, '06b-cobrar-hoy');

    await page.goto('/customers');
    for (const label of ['Cobrar hoy', 'Atrasados', 'Para renovar']) {
      await expect(page.getByText(new RegExp(`^${label} \\(\\d+\\)$`))).toBeVisible();
    }
    await page.getByText(/^Atrasados \(\d+\)$/).click();
    await expect(
      page
        .locator('a[href^="/customers/"]')
        .first()
        .getByText(/^Atrasado \d+ días?$/),
    ).toBeVisible();
    await capture(page, info, '04b-clientes-atrasados');
  });

  test('simulador por categoría, sin tasa ni interés', async ({ page }, info) => {
    await page.goto('/simulator');
    await expect(page.getByRole('heading', { name: 'Simulador' })).toBeVisible();
    await page.getByRole('button', { name: 'Categoría Oro' }).click();
    await expect(page.getByText('Total a devolver')).toBeVisible();
    // El vendedor no ve la tasa, el recargo ni el interes (regla de negocio).
    await expect(page.getByText(/Tasa \d/)).toHaveCount(0);
    await expect(page.getByText(/Recargo/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Ver plan de cuotas' }).click();
    await expect(page.getByText('Resultado')).toBeVisible();
    await expect(page.getByText('Interes total')).toHaveCount(0);
    await capture(page, info, '08-simulador');
  });

  test('productos: solo las categorías habilitadas, sin tasa', async ({ page }, info) => {
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
    for (const tier of ['Hierro', 'Bronce', 'Plata', 'Oro']) {
      await expect(page.getByText(tier, { exact: true })).toBeVisible();
    }
    // Las categorias superiores existen pero estan ocultas para los vendedores.
    await expect(page.getByText('Platino', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Tasa \d|Recargo/)).toHaveCount(0);
    await capture(page, info, '09-productos');
  });

  test('nuevo préstamo: categoría, monto y cuotas con deslizadores', async ({ page }, info) => {
    await page.goto('/loans/new');
    await expect(page.getByRole('heading', { name: 'Nuevo préstamo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Categoría Platino' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Categoría Bronce' }).click();
    // Arranca en el maximo de la categoria y baja de $5.000 en $5.000.
    await expect(page.getByText(/máx\. \$\s50\.000/)).toBeVisible();
    const monto = page.getByRole('slider', { name: 'Monto' });
    await monto.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(monto).toHaveAttribute('aria-valuenow', '45000');
    await expect(page.getByText('Cuota semanal')).toBeVisible();
    await capture(page, info, '10-nuevo-prestamo');
  });

  test('recibo de una cuota cobrada y talonario en papel', async ({ page }, info) => {
    await page.goto('/loans?status=DISBURSED');
    const loans = page.locator('a[href^="/loans/"]:not([href="/loans/new"])');
    await expect(loans.first()).toBeVisible();
    // El primer prestamo en cobranza con alguna cuota cobrada.
    for (let i = 0; i < (await loans.count()); i++) {
      await loans.nth(i).click();
      await expect(page.getByText(/de \d+ cobradas/)).toBeVisible();
      if (await page.getByRole('button', { name: 'Ver recibo' }).count()) break;
      await page.goBack();
      await expect(loans.first()).toBeVisible();
    }
    await expect(page.getByText(/Talonario en papel/)).toBeVisible();
    await page.getByRole('button', { name: 'Ver recibo' }).first().click();
    const recibo = page.getByRole('dialog');
    await expect(recibo.getByText(/^R-[0-9A-F]{8}-\d{2}$/)).toBeVisible();
    await expect(recibo.getByText(/^Pesos .* con \d{2}\/100$/)).toBeVisible();
    await capture(page, info, '07b-recibo-cuota');
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
