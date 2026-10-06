import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { documentationHandler } from '../../../worker/documentation';
import { guideRole, headingId, loadGuide } from './guides';

const secret = 'test-documentation-secret-32-bytes-minimum';
const content = {
  seller: readFileSync('documentation/content/seller/flows.md', 'utf8'),
  admin: readFileSync('documentation/content/admin/flows.md', 'utf8'),
  operator: readFileSync('documentation/content/operator/flows.md', 'utf8'),
  auditor: readFileSync('documentation/content/auditor/flows.md', 'utf8'),
};
const handle = documentationHandler(content);
const env = { LATK_JWT_SECRET: secret, ASSETS: { fetch: vi.fn(async () => new Response('app')) } };
async function token(role: string, key = secret, expiration: string | number = '1h') {
  vi.stubGlobal('crypto', webcrypto);
  // jsdom and Node's WebCrypto otherwise use different typed-array realms.
  vi.stubGlobal('Uint8Array', new TextEncoder().encode('').constructor);
  return new SignJWT({ roles: [role] })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('latk-backend')
    .setSubject('demo')
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(new TextEncoder().encode(key));
}
const request = (jwt?: string, query = '') =>
  new Request(`https://app.example/documentation-api/guide${query}`, {
    headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('role documentation access', () => {
  it.each(['SELLER', 'ADMIN', 'OPERATOR', 'AUDITOR'])(
    'serves only the signed role %s',
    async (role) => {
      const response = await handle(request(await token(role), '?role=admin'), env);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.role).toBe(role.toLowerCase());
      expect(data.markdown).not.toMatch(/^---/);
      expect(response.headers.get('Cache-Control')).toContain('no-store');
      if (role === 'SELLER')
        expect(data.markdown).not.toMatch(/porcentaje|administrador|comisi[oó]n/i);
    },
  );
  it('denies anonymous requests, forged tokens and expired sessions', async () => {
    expect((await handle(request(), env)).status).toBe(401);
    expect(
      (await handle(request(await token('ADMIN', 'a-different-test-secret-at-least-32')), env))
        .status,
    ).toBe(401);
    expect((await handle(request(await token('ADMIN', secret, 1)), env)).status).toBe(401);
  });
  it('fails closed when the secret is missing or the role is unknown', async () => {
    expect((await handle(request(), { ...env, LATK_JWT_SECRET: undefined })).status).toBe(503);
    expect((await handle(request(await token('UNKNOWN')), env)).status).toBe(403);
  });
  it('keeps assets available and rejects unknown documentation routes', async () => {
    expect(await (await handle(new Request('https://app.example/'), env)).text()).toBe('app');
    expect(
      (await handle(new Request('https://app.example/documentation-api/admin'), env)).status,
    ).toBe(404);
  });
  it('rejects unsigned role selection in the frontend', () => {
    expect(guideRole(null)).toBeNull();
    expect(
      guideRole({
        userId: '1',
        fullName: '',
        username: '',
        roles: ['UNKNOWN', 'ADMIN'],
        permissions: [],
        expiresAt: 0,
      }),
    ).toBeNull();
    expect(headingId('3. Simular y solicitar un préstamo')).toBe(
      '3-simular-y-solicitar-un-prestamo',
    );
  });
  it('fetches using the session header without putting tokens in the URL', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ role: 'seller', markdown: '# Guía' }));
    vi.stubGlobal('fetch', fetch);
    await loadGuide('session-token');
    expect(fetch).toHaveBeenCalledWith(
      '/documentation-api/guide',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'Bearer session-token' }),
      }),
    );
    await expect(loadGuide(null)).rejects.toThrow('Iniciá sesión');
  });
});
