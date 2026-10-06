import type { SessionUser } from '../../auth/jwt';
import { Role } from '../../auth/permissions';

export type GuideRole = 'seller' | 'admin' | 'operator' | 'auditor';
export const GUIDE_LABEL: Record<GuideRole, string> = {
  seller: 'Vendedor',
  admin: 'Administrador',
  operator: 'Operador',
  auditor: 'Auditor',
};
const ROLES: Record<string, GuideRole> = {
  [Role.SELLER]: 'seller',
  [Role.ADMIN]: 'admin',
  [Role.OPERATOR]: 'operator',
  [Role.AUDITOR]: 'auditor',
};
/** Match the role displayed for this account; never accept a role from the URL. */
export function guideRole(user: SessionUser | null): GuideRole | null {
  const primary = user?.roles[0];
  return primary && Object.hasOwn(ROLES, primary) ? ROLES[primary]! : null;
}

export async function loadGuide(
  token: string | null,
  signal?: AbortSignal,
): Promise<{ role: GuideRole; markdown: string }> {
  if (!token) throw new Error('Iniciá sesión para consultar la guía.');
  const response = await fetch('/documentation-api/guide', {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error('La documentación no está disponible. Intentá nuevamente más tarde.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo cargar la guía.');
  if (!Object.hasOwn(GUIDE_LABEL, data.role ?? '') || typeof data.markdown !== 'string')
    throw new Error('La guía recibida no es válida.');
  return data;
}

export function documentationSite(role: GuideRole): string | null {
  const urls = {
    seller: import.meta.env.VITE_DOCS_SELLER_URL,
    admin: import.meta.env.VITE_DOCS_ADMIN_URL,
    operator: import.meta.env.VITE_DOCS_OPERATOR_URL,
    auditor: import.meta.env.VITE_DOCS_AUDITOR_URL,
  };
  try {
    const url = new URL(urls[role] ?? '');
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function headingId(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
