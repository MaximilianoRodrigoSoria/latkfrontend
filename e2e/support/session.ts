import { expect, type Page, test } from '@playwright/test';

export type Role = 'admin' | 'seller' | 'emptySeller';

interface Credentials {
  username: string;
  password?: string;
}

/**
 * Usuarios de los datos de prueba. Las contrasenas vienen SOLO de variables de entorno (por
 * ejemplo en un `.env.e2e` local que no se commitea); los usuarios tienen un valor por defecto.
 */
export function credentials(role: Role): Credentials {
  switch (role) {
    case 'admin':
      return {
        username: process.env.E2E_ADMIN_USER ?? 'admin',
        password: process.env.E2E_ADMIN_PASSWORD,
      };
    case 'seller':
      return {
        username: process.env.E2E_SELLER_USER ?? 'vendedor',
        password: process.env.E2E_SELLER_PASSWORD,
      };
    case 'emptySeller':
      return {
        username: process.env.E2E_EMPTY_SELLER_USER ?? 'vendedorTest',
        password: process.env.E2E_EMPTY_SELLER_PASSWORD,
      };
  }
}

/** Saltea el test (con el motivo) si falta la contrasena del rol. */
export function requireCredentials(role: Role): Required<Credentials> {
  const c = credentials(role);
  const variable = {
    admin: 'E2E_ADMIN_PASSWORD',
    seller: 'E2E_SELLER_PASSWORD',
    emptySeller: 'E2E_EMPTY_SELLER_PASSWORD',
  }[role];
  test.skip(!c.password, `Definí ${variable} para correr las pruebas de este rol`);
  return { username: c.username, password: c.password ?? '' };
}

/** Ingresa por la pantalla de login, como un usuario real. */
export async function login(page: Page, role: Role): Promise<void> {
  const { username, password } = requireCredentials(role);
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(username);
  await page.getByLabel('Contrasena').fill(password);
  await page.getByRole('button', { name: /ingresar/i }).click();
  await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible();
}
