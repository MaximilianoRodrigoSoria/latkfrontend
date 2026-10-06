import { jwtVerify } from 'jose';

export type GuideRole = 'seller' | 'admin' | 'operator' | 'auditor';
export interface DocumentationEnv {
  LATK_JWT_SECRET?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}
const roles: Record<string, GuideRole> = {
  SELLER: 'seller',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  AUDITOR: 'auditor',
};
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Authorization',
      'X-Content-Type-Options': 'nosniff',
    },
  });

export function documentationHandler(content: Record<GuideRole, string>) {
  return async (request: Request, env: DocumentationEnv): Promise<Response> => {
    const path = new URL(request.url).pathname;
    if (!path.startsWith('/documentation-api/')) return env.ASSETS.fetch(request);
    if (path !== '/documentation-api/guide')
      return json({ message: 'Documento no encontrado' }, 404);
    if (request.method !== 'GET') return json({ message: 'Método no permitido' }, 405);
    if (!env.LATK_JWT_SECRET || new TextEncoder().encode(env.LATK_JWT_SECRET).length < 32) {
      return json({ message: 'La documentación todavía no está configurada.' }, 503);
    }
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer '))
      return json({ message: 'Iniciá sesión para consultar la guía.' }, 401);
    try {
      const { payload } = await jwtVerify(
        authorization.slice(7),
        new TextEncoder().encode(env.LATK_JWT_SECRET),
        {
          algorithms: ['HS256'],
          issuer: 'latk-backend',
          requiredClaims: ['sub', 'exp', 'iat'],
        },
      );
      const primary = Array.isArray(payload.roles) ? payload.roles[0] : undefined;
      const role =
        typeof primary === 'string' && Object.hasOwn(roles, primary) ? roles[primary] : undefined;
      if (!role) return json({ message: 'No hay una guía para el rol de esta cuenta.' }, 403);
      return json({ role, markdown: content[role].replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '') });
    } catch {
      return json({ message: 'Tu sesión no es válida. Volvé a ingresar.' }, 401);
    }
  };
}
