import { describe, expect, it } from 'vitest';
import type { LoanResponse } from '../../api/types';
import { amountInWords, integerInWords, receiptNumber, remainingAfter } from './receipt';

describe('recibo de cobro', () => {
  it('numera el recibo con el prestamo y la cuota', () => {
    expect(receiptNumber('3a1f09c2-1111-2222-3333-444455556666', 4)).toBe('R-3A1F09C2-04');
  });

  it('escribe montos en letras como en un recibo', () => {
    expect(integerInWords(23770)).toBe('veintitrés mil setecientos setenta');
    expect(integerInWords(100000)).toBe('cien mil');
    expect(integerInWords(121000)).toBe('ciento veintiún mil');
    expect(integerInWords(1_500_000)).toBe('un millón quinientos mil');
    expect(integerInWords(35)).toBe('treinta y cinco');
    expect(amountInWords(9800.5)).toBe('Pesos nueve mil ochocientos con 50/100');
  });

  it('el saldo es el del momento de esa cuota, no el de hoy', () => {
    const cuota = (number: number) => ({
      number,
      dueDate: '2026-10-01',
      amount: 10000,
      principal: 8000,
      interest: 2000,
      remainingBalance: 0,
      status: 'COLLECTED' as const,
      overdue: false,
    });
    const loan = { schedule: [1, 2, 3, 4].map(cuota) } as unknown as LoanResponse;
    expect(remainingAfter(loan, 1)).toEqual({ amount: 30000, installments: 3 });
    expect(remainingAfter(loan, 4)).toEqual({ amount: 0, installments: 0 });
  });
});
