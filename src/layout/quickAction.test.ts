import { describe, expect, it } from 'vitest';
import type { SessionUser } from '../auth/jwt';
import { quickAction } from './AppLayout';

const user = (permissions: string[]): SessionUser => ({
  userId: 'u',
  username: 'u',
  fullName: 'U',
  roles: [],
  permissions,
  expiresAt: Date.now() + 60_000,
});

const admin = user(['loan.request', 'seller.manage', 'customer.create', 'product.manage']);
const seller = user(['loan.request', 'customer.create']);

describe('el "+" de la barra inferior', () => {
  it('en cada listado da de alta en esa pantalla', () => {
    expect(quickAction('/sellers', admin)?.label).toBe('Nuevo vendedor');
    expect(quickAction('/customers', admin)?.to).toBe('/customers?nuevo=1');
    expect(quickAction('/products', admin)?.label).toBe('Nueva categoría');
  });

  it('en el resto (y en los detalles) pide un préstamo', () => {
    expect(quickAction('/', admin)?.to).toBe('/loans/new');
    expect(quickAction('/sellers/123', admin)?.to).toBe('/loans/new');
  });

  it('respeta los permisos', () => {
    expect(quickAction('/products', seller)?.label).toBe('Nuevo préstamo');
    expect(quickAction('/customers', seller)?.label).toBe('Nuevo cliente');
    expect(quickAction('/', user([]))).toBeNull();
  });
});
