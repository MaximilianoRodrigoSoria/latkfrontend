import { beforeEach, describe, expect, it } from 'vitest';
import type { InstallmentResponse, LoanResponse } from '../../api/types';
import { ApiError } from '../../api/http';
import { settleTotal } from './LoanActionsMenu';
import { isOfflineError, useOfflineCollections } from './offlineCollections';
import { receiptData, receiptMessage } from './receipt';

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

const loanWith = (schedule: InstallmentResponse[]) =>
  ({
    id: '3a1f09c2-1111-2222-3333-444455556666',
    customerName: 'Ana',
    customerDni: null,
    installments: schedule.length,
    productName: 'Semanal',
    sellerName: 'Mati',
    schedule,
  }) as unknown as LoanResponse;

describe('saldar prestamo', () => {
  it('suma lo pendiente menos abonos y aparte la mora', () => {
    const loan = loanWith([
      cuota(1, { status: 'COLLECTED' }),
      cuota(2, { paidAmount: 4000, lateFee: 150 }),
      cuota(3),
    ]);
    expect(settleTotal(loan)).toEqual({ pending: 2, amount: 16000, late: 150 });
  });
});

describe('recibo con mora', () => {
  it('la cuota cobrada con recargo suma la mora al monto y la detalla', () => {
    const row = cuota(1, { status: 'COLLECTED', lateFee: 1226.4, collectedByName: 'Mati' });
    const data = receiptData(loanWith([row]), row);
    expect(data.amount).toBe(11226.4);
    expect(data.lateFee).toBe(1226.4);
    expect(receiptMessage(data)).toContain('Incluye recargo por mora');
  });

  it('una cuota pendiente con mora acumulada no la pone en el recibo', () => {
    const row = cuota(1, { lateFee: 300 });
    expect(receiptData(loanWith([row]), row).lateFee).toBeUndefined();
  });
});

describe('cobros sin conexion', () => {
  beforeEach(() => useOfflineCollections.setState({ pending: [] }));

  it('guarda el cobro con referencia y hora, y lo puede quitar', () => {
    const entry = useOfflineCollections
      .getState()
      .add({ loanId: 'l1', customerName: 'Ana', number: 2 });
    expect(entry.reference).toMatch(/^[0-9a-f-]{36}$/);
    expect(useOfflineCollections.getState().pending).toHaveLength(1);
    useOfflineCollections.getState().remove(entry.reference);
    expect(useOfflineCollections.getState().pending).toHaveLength(0);
  });

  it('reconoce la falta de conexion por el error de red', () => {
    expect(isOfflineError(new ApiError({ status: 0, title: 'Sin conexion' }))).toBe(true);
    expect(isOfflineError(new ApiError({ status: 409, title: 'Conflicto' }))).toBe(false);
  });
});
