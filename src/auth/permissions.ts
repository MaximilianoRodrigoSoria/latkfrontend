import type { SessionUser } from './jwt';

export const Role = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  SELLER: 'SELLER',
  AUDITOR: 'AUDITOR',
} as const;

export const Permission = {
  PRODUCT_READ: 'product.read',
  PRODUCT_MANAGE: 'product.manage',
  PARAMETER_MANAGE: 'parameter.manage',
  LOAN_SIMULATE: 'loan.simulate',
  DASHBOARD_READ: 'dashboard.read',
} as const;

export function hasPermission(user: SessionUser | null, permission: string): boolean {
  return !!user && user.permissions.includes(permission);
}

export function isAdmin(user: SessionUser | null): boolean {
  return !!user && user.roles.includes(Role.ADMIN);
}

/**
 * Regla de negocio: la proteccion de capturas aplica a todo rol que no sea ADMIN. Sin sesion
 * tambien se protege (fail-safe).
 */
export function requiresScreenProtection(user: SessionUser | null): boolean {
  return !isAdmin(user);
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
  SELLER: 'Vendedor',
  AUDITOR: 'Auditor',
};

export function roleLabel(user: SessionUser | null): string {
  const role = user?.roles[0];
  return role ? (ROLE_LABELS[role] ?? role) : '';
}
