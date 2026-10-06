import { describe, expect, it } from 'vitest';
import type { InstallmentResponse, LoanResponse } from '../../api/types';
import { fixedInstallmentFor, fixedInterest } from '../products/FixedInstallmentsModal';
import type { PendingCollection } from './offlineCollections';
import { provisionalReceiptData, receiptMessage } from './receipt';

const cuota = (number: number, extra: Partial<InstallmentResponse> = {}): InstallmentResponse =>
  ({
    number,
    dueDate: '2026-10-01',
    amount: 10000,
    principal: 8000,
    interest: 2000,
    remainingBalance: 0,
    status: 'PENDING',
    overdue: false,
    ...extra,
  }) as InstallmentResponse;

const loan = {
  id: '3a1f09c2-1111-2222-3333-444455556666',
  customerName: 'Ana',
  customerDni: null,
  installments: 3,
  productName: 'Semanal',
  sellerName: 'Mati',
  schedule: [cuota(1), cuota(2), cuota(3)],
} as unknown as LoanResponse;

const pending = (amount?: number): PendingCollection => ({
  reference: 'abcdef12-3456-7890-abcd-ef1234567890',
  loanId: loan.id,
  customerName: 'Ana',
  number: 1,
  amount,
  collectedAt: '2026-10-06T15:00:00Z',
});

describe('recibo provisorio sin conexion', () => {
  it('cuota completa: numero provisorio, saldo sin esa cuota y aviso de pendiente', () => {
    const data = provisionalReceiptData(loan, cuota(1), pending(), 'Mati');
    expect(data.number).toBe('PROV-ABCDEF12');
    expect(data.provisional).toBe(true);
    expect(data.amount).toBe(10000);
    expect(data.remaining).toEqual({ amount: 20000, installments: 2 });
    const text = receiptMessage(data);
    expect(text).toContain('Recibo provisorio');
    expect(text).toContain('Pendiente de confirmar');
  });

  it('abono parcial: indica lo que resta de la cuota', () => {
    const data = provisionalReceiptData(loan, cuota(1), pending(4000), 'Mati');
    expect(data.amount).toBe(4000);
    expect(data.partialRemaining).toBe(6000);
    expect(data.remaining).toEqual({ amount: 26000, installments: 3 });
  });
});

describe('cuota fija', () => {
  it('escala la cuota de $10.000 al monto y redondea hacia arriba a $10', () => {
    expect(fixedInstallmentFor(15000, 2200)).toBe(3300);
    expect(fixedInstallmentFor(12345, 500)).toBe(620);
    expect(fixedInterest(2200, 6)).toBeCloseTo(0.32);
  });
});
