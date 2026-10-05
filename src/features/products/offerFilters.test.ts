import { describe, expect, it } from 'vitest';
import type { ProductOffer } from '../../api/types';
import { applyFilters, availableAmounts } from './offerFilters';

const option = (amount: number) => ({
  amount,
  installments: 4,
  installmentAmount: 1,
  totalToRepay: 4,
});

const offers: ProductOffer[] = [
  {
    productId: 'm',
    productName: 'Mensual',
    frequency: 'MONTHLY',
    ratePerPeriod: 0.04,
    options: [option(50000), option(100000)],
  },
  {
    productId: 's',
    productName: 'Semanal',
    frequency: 'WEEKLY',
    ratePerPeriod: 0.01,
    options: [option(100000), option(200000)],
  },
];

describe('filtros de ofertas', () => {
  it('lista los montos sin repetir y ordenados', () => {
    expect(availableAmounts(offers)).toEqual([50000, 100000, 200000]);
  });

  it('filtra por frecuencia', () => {
    expect(
      applyFilters(offers, { frequency: 'WEEKLY', amount: null }).map((o) => o.productId),
    ).toEqual(['s']);
  });

  it('filtra por monto y descarta productos sin ese monto', () => {
    const result = applyFilters(offers, { frequency: 'ALL', amount: 50000 });
    expect(result.map((o) => o.productId)).toEqual(['m']);
    expect(result[0]!.options.map((o) => o.amount)).toEqual([50000]);
  });

  it('combina ambos filtros', () => {
    expect(applyFilters(offers, { frequency: 'MONTHLY', amount: 200000 })).toEqual([]);
  });
});
