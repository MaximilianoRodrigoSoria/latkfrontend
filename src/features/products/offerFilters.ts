import type { PaymentFrequency, ProductOffer } from '../../api/types';

export type FrequencyFilter = 'ALL' | PaymentFrequency;

export interface OfferFilters {
  frequency: FrequencyFilter;
  /** null = todos los montos. */
  amount: number | null;
}

/** Montos distintos de todas las ofertas, ordenados: arman los chips del filtro. */
export function availableAmounts(offers: ProductOffer[]): number[] {
  return [...new Set(offers.flatMap((o) => o.options.map((opt) => opt.amount)))].sort(
    (a, b) => a - b,
  );
}

/** Aplica frecuencia y monto; descarta productos que quedan sin opciones. */
export function applyFilters(offers: ProductOffer[], filters: OfferFilters): ProductOffer[] {
  return offers
    .filter((o) => filters.frequency === 'ALL' || o.frequency === filters.frequency)
    .map((o) =>
      filters.amount === null
        ? o
        : { ...o, options: o.options.filter((opt) => opt.amount === filters.amount) },
    )
    .filter((o) => o.options.length > 0);
}
