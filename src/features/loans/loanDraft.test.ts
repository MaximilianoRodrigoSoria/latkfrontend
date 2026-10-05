import { describe, expect, it } from 'vitest';
import type { ProductOffer } from '../../api/types';
import {
  amountsOf,
  EMPTY_DRAFT,
  installmentOptions,
  isComplete,
  reconcile,
  selectedOption,
} from './loanDraft';

const option = (amount: number, installments: number) => ({
  amount,
  installments,
  installmentAmount: Math.ceil((amount * 1.2) / installments / 10) * 10,
  totalToRepay: Math.ceil((amount * 1.2) / installments / 10) * 10 * installments,
});

const offers: ProductOffer[] = [
  {
    productId: 'sem',
    productName: 'Semanal',
    frequency: 'WEEKLY',
    ratePerPeriod: 0.03,
    options: [option(100000, 6), option(50000, 4), option(100000, 4), option(50000, 6)],
  },
  {
    productId: 'men',
    productName: 'Mensual',
    frequency: 'MONTHLY',
    ratePerPeriod: 0.1,
    options: [option(200000, 4)],
  },
];

describe('loanDraft', () => {
  it('lista montos y cuotas ordenados', () => {
    expect(amountsOf(offers[0])).toEqual([50000, 100000]);
    expect(installmentOptions(offers[0], 100000).map((o) => o.installments)).toEqual([4, 6]);
    expect(installmentOptions(offers[0], null)).toEqual([]);
  });

  it('devuelve la opcion elegida solo con la seleccion completa', () => {
    const draft = { ...EMPTY_DRAFT, productId: 'sem', amount: 100000, installments: 4 };
    expect(selectedOption(offers[0], draft)?.installmentAmount).toBe(30000);
    expect(selectedOption(offers[0], { ...draft, installments: null })).toBeNull();
  });

  it('al cambiar de producto limpia monto y cuotas que ya no existen', () => {
    const draft = {
      customerId: 'c1',
      productId: 'men',
      amount: 100000,
      installments: 6,
    };
    expect(reconcile(offers, draft)).toEqual({
      customerId: 'c1',
      productId: 'men',
      amount: null,
      installments: null,
    });
  });

  it('conserva la seleccion valida', () => {
    const draft = { customerId: 'c1', productId: 'sem', amount: 50000, installments: 6 };
    expect(reconcile(offers, draft)).toEqual(draft);
    expect(isComplete(draft)).toBe(true);
    expect(isComplete({ ...draft, customerId: null })).toBe(false);
  });
});
