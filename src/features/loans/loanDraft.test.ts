import { describe, expect, it } from 'vitest';
import type { ProductOffer } from '../../api/types';
import { findOption, offerAmounts, offerInstallments } from '../products/tiers';
import { EMPTY_DRAFT, isComplete } from './loanDraft';
import { chooseProduct, EMPTY_CHOICE, nearest } from './LoanPicker';

const option = (amount: number, installments: number) => ({
  amount,
  installments,
  installmentAmount: Math.ceil((amount * 1.2) / installments / 10) * 10,
  totalToRepay: Math.ceil((amount * 1.2) / installments / 10) * 10 * installments,
});

const grid = (amounts: number[], installments: number[]) =>
  amounts.flatMap((a) => installments.map((n) => option(a, n)));

const bronce: ProductOffer = {
  productId: 'bronce',
  productName: 'Bronce',
  frequency: 'WEEKLY',
  tier: 'BRONZE',
  tierLabel: 'Bronce',
  sellerVisible: true,
  options: grid([50000, 25000, 30000, 35000, 40000, 45000], [4, 5, 6, 7, 8]),
};

const oro: ProductOffer = {
  productId: 'oro',
  productName: 'Oro',
  frequency: 'WEEKLY',
  tier: 'GOLD',
  tierLabel: 'Oro',
  sellerVisible: true,
  options: grid([75000, 80000, 85000, 90000, 95000, 100000], [4, 5, 6, 7, 8, 9, 10, 11, 12]),
};

describe('selector de categoria, monto y cuotas', () => {
  it('lista montos y cuotas ordenados', () => {
    expect(offerAmounts(bronce)).toEqual([25000, 30000, 35000, 40000, 45000, 50000]);
    expect(offerInstallments(bronce, 30000)).toEqual([4, 5, 6, 7, 8]);
    expect(offerAmounts(undefined)).toEqual([]);
  });

  it('al elegir categoria arranca en el monto maximo y las cuotas del medio', () => {
    expect(chooseProduct(bronce, EMPTY_CHOICE)).toEqual({
      productId: 'bronce',
      amount: 50000,
      installments: 6,
    });
  });

  it('al cambiar de categoria conserva lo que sigue valiendo', () => {
    const fromBronce = { productId: 'bronce', amount: 50000, installments: 8 };
    // 50.000 no existe en Oro (va al maximo); 8 cuotas si existen.
    expect(chooseProduct(oro, fromBronce)).toEqual({
      productId: 'oro',
      amount: 100000,
      installments: 8,
    });
  });

  it('el deslizador se ajusta al valor permitido mas cercano', () => {
    expect(nearest([4, 6, 8, 12, 16], 10)).toBe(8);
    expect(nearest([25000, 30000, 35000], 33000)).toBe(35000);
  });

  it('encuentra la opcion elegida solo si existe', () => {
    expect(findOption(oro, 100000, 12)?.installments).toBe(12);
    expect(findOption(oro, 100000, 16)).toBeUndefined();
  });

  it('la solicitud esta completa con cliente, categoria, monto y cuotas', () => {
    const draft = { customerId: 'c1', productId: 'oro', amount: 100000, installments: 8 };
    expect(isComplete(draft)).toBe(true);
    expect(isComplete({ ...draft, customerId: null })).toBe(false);
    expect(isComplete(EMPTY_DRAFT)).toBe(false);
  });
});
