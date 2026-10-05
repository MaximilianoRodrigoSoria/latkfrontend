import { describe, expect, it } from 'vitest';
import { decodeSession } from './jwt';
import { hasPermission, isAdmin, requiresScreenProtection } from './permissions';

function fakeToken(claims: Record<string, unknown>): string {
  const encode = (o: unknown) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.firma`;
}

describe('sesion y permisos', () => {
  const seller = decodeSession(
    fakeToken({
      sub: 'u1',
      username: 'juan',
      name: 'Juan Perez',
      roles: ['SELLER'],
      permissions: ['loan.simulate', 'product.read'],
      exp: 2_000_000_000,
    }),
  );
  const admin = decodeSession(
    fakeToken({ sub: 'u2', username: 'admin', roles: ['ADMIN'], permissions: [], exp: 1 }),
  );

  it('decodifica los claims del backend', () => {
    expect(seller.fullName).toBe('Juan Perez');
    expect(seller.expiresAt).toBe(2_000_000_000_000);
  });

  it('decodifica nombres con acentos (UTF-8)', () => {
    const user = decodeSession(fakeToken({ sub: 'x', name: 'Mariano Gómez' }));
    expect(user.fullName).toBe('Mariano Gómez');
  });

  it('los permisos salen del token', () => {
    expect(hasPermission(seller, 'loan.simulate')).toBe(true);
    expect(hasPermission(seller, 'product.manage')).toBe(false);
  });

  it('protege capturas para todo rol que no sea ADMIN, y sin sesion', () => {
    expect(requiresScreenProtection(seller)).toBe(true);
    expect(requiresScreenProtection(null)).toBe(true);
    expect(isAdmin(admin)).toBe(true);
    expect(requiresScreenProtection(admin)).toBe(false);
  });
});
