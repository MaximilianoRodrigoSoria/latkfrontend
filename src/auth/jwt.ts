/** Claims que emite el backend (modulo security). */
export interface SessionUser {
  userId: string;
  username: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  expiresAt: number;
}

/**
 * Decodifica el payload SIN verificar la firma: solo sirve para la UI (mostrar el nombre, ocultar
 * menues). La autorizacion real la hace siempre el backend.
 */
export function decodeSession(token: string): SessionUser {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Token invalido');
  const json = decodeBase64Url(payload);
  const claims = JSON.parse(json) as Record<string, unknown>;
  return {
    userId: String(claims.sub ?? ''),
    username: String(claims.username ?? ''),
    fullName: String(claims.name ?? claims.username ?? ''),
    roles: asStringArray(claims.roles),
    permissions: asStringArray(claims.permissions),
    expiresAt: Number(claims.exp ?? 0) * 1000,
  };
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
