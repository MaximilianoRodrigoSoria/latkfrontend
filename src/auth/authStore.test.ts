import { beforeEach, describe, expect, it, vi } from 'vitest';

function fakeToken(sub: string, name: string, roles: string[]): string {
  const encode = (o: unknown) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode({ sub, username: sub, name, roles, permissions: [], exp: 2_000_000_000 })}.firma`;
}

const SELLER = fakeToken('vendedor', 'Vendedor Demo', ['SELLER']);
const ADMIN = fakeToken('admin', 'Administrador', ['ADMIN']);

/** Cada test simula una pestaña nueva: el store se arma de cero leyendo el almacenamiento. */
async function newTab() {
  vi.resetModules();
  sessionStorage.clear();
  return (await import('./authStore')).useAuthStore;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('varias cuentas en el mismo navegador', () => {
  it('ingresar con otra cuenta no borra la anterior y se puede volver a ella', async () => {
    const store = await newTab();
    store.getState().signIn(SELLER);
    store.getState().signIn(ADMIN);
    expect(store.getState().user?.userId).toBe('admin');
    expect(store.getState().accounts.map((a) => a.user.userId)).toEqual(['vendedor', 'admin']);

    store.getState().switchAccount('vendedor');
    expect(store.getState().user?.fullName).toBe('Vendedor Demo');
    expect(store.getState().token).toBe(SELLER);
  });

  it('si otra pestaña ingresa como admin, esta pestaña sigue como vendedor', async () => {
    const store = await newTab();
    store.getState().signIn(SELLER);

    // Otra pestaña guarda las dos cuentas y avisa por el evento "storage".
    const both = JSON.stringify([
      { token: SELLER, user: store.getState().user },
      { token: ADMIN, user: { ...store.getState().user!, userId: 'admin', fullName: 'Admin' } },
    ]);
    localStorage.setItem('latk-accounts', both);
    window.dispatchEvent(new StorageEvent('storage', { key: 'latk-accounts', newValue: both }));

    expect(store.getState().user?.userId).toBe('vendedor');
    expect(store.getState().accounts).toHaveLength(2);
  });

  it('si otra pestaña cierra la cuenta de esta, vuelve al ingreso sin tomar otra cuenta', async () => {
    const store = await newTab();
    store.getState().signIn(ADMIN);
    store.getState().signIn(SELLER);

    const onlyAdmin = JSON.stringify(
      store.getState().accounts.filter((a) => a.user.userId === 'admin'),
    );
    localStorage.setItem('latk-accounts', onlyAdmin);
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'latk-accounts', newValue: onlyAdmin }),
    );

    expect(store.getState().user).toBeNull();
    expect(store.getState().accounts.map((a) => a.user.userId)).toEqual(['admin']);
  });

  it('cerrar sesion cierra solo la cuenta activa', async () => {
    const store = await newTab();
    store.getState().signIn(SELLER);
    store.getState().signIn(ADMIN);
    store.getState().signOut();
    expect(store.getState().user).toBeNull();
    expect(store.getState().accounts.map((a) => a.user.userId)).toEqual(['vendedor']);
  });

  it('una pestaña nueva abre con la ultima cuenta usada', async () => {
    const first = await newTab();
    first.getState().signIn(SELLER);
    first.getState().signIn(ADMIN);
    first.getState().switchAccount('vendedor');

    const second = await newTab();
    expect(second.getState().user?.userId).toBe('vendedor');
    expect(second.getState().accounts).toHaveLength(2);
  });

  it('migra la sesion guardada por la version anterior', async () => {
    localStorage.setItem('latk-session', JSON.stringify({ state: { token: SELLER }, version: 0 }));
    localStorage.setItem('latk-last:web', 'vendedor');
    const store = await newTab();
    expect(store.getState().user?.userId).toBe('vendedor');
    expect(localStorage.getItem('latk-session')).toBeNull();
  });
});
