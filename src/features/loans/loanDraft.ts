import type { LoanStatus } from '../../api/types';

/** Seleccion del vendedor mientras arma la solicitud. */
export interface LoanDraft {
  customerId: string | null;
  productId: string | null;
  amount: number | null;
  installments: number | null;
}

export const EMPTY_DRAFT: LoanDraft = {
  customerId: null,
  productId: null,
  amount: null,
  installments: null,
};

export function isComplete(draft: LoanDraft): boolean {
  return (
    draft.customerId !== null &&
    draft.productId !== null &&
    draft.amount !== null &&
    draft.installments !== null
  );
}

export const STATUS_LABEL: Record<LoanStatus, string> = {
  REQUESTED: 'Pendiente de aprobación',
  APPROVED: 'Falta transferir',
  REJECTED: 'Rechazado',
  DISBURSED: 'En cobranza',
  COMPLETED: 'Finalizado',
};

export const STATUS_COLOR: Record<LoanStatus, string> = {
  REQUESTED: 'yellow',
  APPROVED: 'blue',
  REJECTED: 'red',
  DISBURSED: 'green',
  COMPLETED: 'gray',
};

/** Un cliente con un prestamo en alguno de estos estados no puede pedir otro. */
export function isOpen(status: LoanStatus): boolean {
  return status !== 'REJECTED' && status !== 'COMPLETED';
}

/** Fecha de hoy en formato ISO (YYYY-MM-DD), la misma que usa el backend. */
export function todayIso(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
