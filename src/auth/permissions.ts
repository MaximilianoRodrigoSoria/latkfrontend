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
  COMMISSION_READ_OWN: 'commission.read.own',
  CUSTOMER_CREATE: 'customer.create',
  LOAN_REQUEST: 'loan.request',
  LOAN_APPROVE: 'loan.approve',
  DISBURSEMENT_REGISTER: 'disbursement.register',
  COLLECTION_REGISTER: 'collection.register',
  COLLECTION_REVERT: 'collection.revert',
  SELLER_MANAGE: 'seller.manage',
  PROFILE_MANAGE_OWN: 'profile.manage.own',
  LOAN_READ_OWN: 'loan.read.own',
  LOAN_READ_ALL: 'loan.read.all',
} as const;

export function hasPermission(user: SessionUser | null, permission: string): boolean {
  return !!user && user.permissions.includes(permission);
}

export function hasAnyPermission(user: SessionUser | null, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

export function isAdmin(user: SessionUser | null): boolean {
  return !!user && user.roles.includes(Role.ADMIN);
}

/** Solo un vendedor tiene porcentaje de comision propio para revelar. */
export function isSeller(user: SessionUser | null): boolean {
  return !!user && user.roles.includes(Role.SELLER);
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
