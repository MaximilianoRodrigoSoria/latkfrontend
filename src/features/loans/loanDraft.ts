import type { LoanStatus, OfferOption, ProductOffer } from '../../api/types';

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

/** Montos habilitados del producto, de menor a mayor. */
export function amountsOf(offer: ProductOffer | undefined): number[] {
  if (!offer) return [];
  return [...new Set(offer.options.map((o) => o.amount))].sort((a, b) => a - b);
}

/** Opciones de cuotas para un monto del producto, de menor a mayor. */
export function installmentOptions(
  offer: ProductOffer | undefined,
  amount: number | null,
): OfferOption[] {
  if (!offer || amount === null) return [];
  return offer.options
    .filter((o) => o.amount === amount)
    .sort((a, b) => a.installments - b.installments);
}

/** La opcion elegida (cuota y total), o null si la seleccion esta incompleta. */
export function selectedOption(
  offer: ProductOffer | undefined,
  draft: LoanDraft,
): OfferOption | null {
  return (
    installmentOptions(offer, draft.amount).find((o) => o.installments === draft.installments) ??
    null
  );
}

/**
 * Cambiar el producto o el monto invalida lo que depende de ellos: si el monto o las cuotas ya no
 * existen en la nueva seleccion, se limpian.
 */
export function reconcile(offers: ProductOffer[], draft: LoanDraft): LoanDraft {
  const offer = offers.find((o) => o.productId === draft.productId);
  if (!offer) return { ...draft, productId: null, amount: null, installments: null };
  const amount =
    draft.amount !== null && amountsOf(offer).includes(draft.amount) ? draft.amount : null;
  const installments =
    amount !== null &&
    installmentOptions(offer, amount).some((o) => o.installments === draft.installments)
      ? draft.installments
      : null;
  return { ...draft, amount, installments };
}

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
