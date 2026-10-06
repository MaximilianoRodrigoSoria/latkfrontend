import { describe, expect, it } from 'vitest';
import {
  customerCollectionState,
  daysBetween,
  lastPayment,
  lastPaymentLabel,
  loanCollectionState,
  readyToRenew,
} from './collectionState';

const TODAY = '2026-10-06';

describe('estado de cobro de un préstamo', () => {
  it('atrasado, hoy y próximo según la cuota pendiente más vieja', () => {
    expect(loanCollectionState({ status: 'DISBURSED', nextDueDate: '2026-10-01' }, TODAY)).toEqual({
      kind: 'OVERDUE',
      days: 5,
    });
    expect(loanCollectionState({ status: 'DISBURSED', nextDueDate: TODAY }, TODAY)?.kind).toBe(
      'TODAY',
    );
    expect(loanCollectionState({ status: 'DISBURSED', nextDueDate: '2026-10-09' }, TODAY)).toEqual({
      kind: 'UPCOMING',
      days: 3,
    });
  });

  it('terminado, en trámite y rechazado', () => {
    expect(loanCollectionState({ status: 'COMPLETED' }, TODAY)?.kind).toBe('DONE');
    expect(loanCollectionState({ status: 'APPROVED' }, TODAY)?.kind).toBe('PENDING');
    expect(loanCollectionState({ status: 'REJECTED' }, TODAY)).toBeNull();
  });
});

describe('estado de un cliente', () => {
  it('gana lo más urgente', () => {
    const state = customerCollectionState(
      [
        { status: 'COMPLETED' },
        { status: 'DISBURSED', nextDueDate: '2026-10-08' },
        { status: 'DISBURSED', nextDueDate: '2026-10-03' },
        { status: 'DISBURSED', nextDueDate: '2026-09-30' },
      ],
      TODAY,
    );
    expect(state).toEqual({ kind: 'OVERDUE', days: 6 });
  });

  it('para renovar: terminó y no tiene nada en curso', () => {
    expect(readyToRenew([{ status: 'COMPLETED' }, { status: 'REJECTED' }])).toBe(true);
    expect(readyToRenew([{ status: 'COMPLETED' }, { status: 'REQUESTED' }])).toBe(false);
    expect(readyToRenew([])).toBe(false);
  });
});

describe('último pago', () => {
  it('toma el más reciente y lo dice en días', () => {
    const last = lastPayment([
      { lastPaymentAt: '2026-10-01T15:00:00Z' },
      { lastPaymentAt: null },
      { lastPaymentAt: '2026-10-04T15:00:00Z' },
    ]);
    expect(last).toBe('2026-10-04T15:00:00Z');
    expect(lastPaymentLabel(last, TODAY)).toBe('Pagó hace 2 días');
    expect(lastPaymentLabel(null, TODAY)).toBeNull();
    expect(daysBetween('2026-09-30', TODAY)).toBe(6);
  });
});
