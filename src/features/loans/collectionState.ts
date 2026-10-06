import type { InstallmentResponse, LoanResponse } from '../../api/types';
import { isOpen, todayIso } from './loanDraft';

/**
 * Estado de cobro: un unico chip por tarjeta (prestamo o cliente). El mas urgente gana:
 * atrasado > hoy > proximo > en tramite > terminado.
 */
export type CollectionKind = 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'PENDING' | 'DONE';

export interface CollectionState {
  kind: CollectionKind;
  /** Dias de atraso (OVERDUE) o que faltan para el vencimiento (UPCOMING). */
  days: number;
}

const URGENCY: Record<CollectionKind, number> = {
  OVERDUE: 0,
  TODAY: 1,
  UPCOMING: 2,
  PENDING: 3,
  DONE: 4,
};

const DAY_MS = 86_400_000;

/** Dias entre dos fechas ISO (YYYY-MM-DD): positivo si {@code to} es posterior. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** Estado de cobro de un prestamo; null si no corresponde (rechazado). */
export function loanCollectionState(
  loan: Pick<LoanResponse, 'status' | 'nextDueDate'>,
  today = todayIso(),
): CollectionState | null {
  switch (loan.status) {
    case 'COMPLETED':
      return { kind: 'DONE', days: 0 };
    case 'REQUESTED':
    case 'APPROVED':
      return { kind: 'PENDING', days: 0 };
    case 'DISBURSED': {
      if (!loan.nextDueDate) return { kind: 'DONE', days: 0 };
      const days = daysBetween(today, loan.nextDueDate);
      if (days < 0) return { kind: 'OVERDUE', days: -days };
      if (days === 0) return { kind: 'TODAY', days: 0 };
      return { kind: 'UPCOMING', days };
    }
    default:
      return null;
  }
}

/** El estado mas urgente entre varios (el atraso mas largo, el vencimiento mas cercano). */
export function mostUrgent(states: (CollectionState | null)[]): CollectionState | null {
  return states.reduce<CollectionState | null>((best, s) => {
    if (!s) return best;
    if (!best) return s;
    if (URGENCY[s.kind] !== URGENCY[best.kind])
      return URGENCY[s.kind] < URGENCY[best.kind] ? s : best;
    if (s.kind === 'OVERDUE') return s.days > best.days ? s : best;
    return s.days < best.days ? s : best;
  }, null);
}

/** Estado de un cliente segun sus prestamos. */
export function customerCollectionState(
  loans: Pick<LoanResponse, 'status' | 'nextDueDate'>[],
  today = todayIso(),
): CollectionState | null {
  return mostUrgent(loans.map((l) => loanCollectionState(l, today)));
}

/** Para renovar: termino al menos un prestamo y no tiene ninguno en curso. */
export function readyToRenew(loans: Pick<LoanResponse, 'status'>[]): boolean {
  return loans.some((l) => l.status === 'COMPLETED') && !loans.some((l) => isOpen(l.status));
}

/** Para cobrar hoy: vence hoy o esta atrasado. */
export const isDueToday = (state: CollectionState | null) =>
  state?.kind === 'TODAY' || state?.kind === 'OVERDUE';

/** Ultimo cobro mas reciente entre varios prestamos (ISO), o null. */
export function lastPayment(loans: Pick<LoanResponse, 'lastPaymentAt'>[]): string | null {
  return loans.reduce<string | null>(
    (latest, l) =>
      l.lastPaymentAt && (!latest || l.lastPaymentAt > latest) ? l.lastPaymentAt : latest,
    null,
  );
}

/** "Pagó hoy", "ayer" o "hace N días". */
export function lastPaymentLabel(
  iso: string | null | undefined,
  today = todayIso(),
): string | null {
  if (!iso) return null;
  const days = daysBetween(todayIso(new Date(iso)), today);
  if (days <= 0) return 'Pagó hoy';
  if (days === 1) return 'Pagó ayer';
  return `Pagó hace ${days} días`;
}

/**
 * Puntualidad de una cuota cobrada: dias entre el vencimiento y el dia del cobro (0 o menos: a
 * tiempo). null si no esta cobrada.
 */
export function paymentDelay(
  row: Pick<InstallmentResponse, 'status' | 'dueDate' | 'collectedAt'>,
): number | null {
  if (row.status !== 'COLLECTED' || !row.collectedAt) return null;
  return daysBetween(row.dueDate, todayIso(new Date(row.collectedAt)));
}
