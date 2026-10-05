import { describe, expect, it } from 'vitest';
import type { CustomerActivity } from '../../api/types';
import { activityDetail, activityTitle } from './CustomerActivityCard';

const base: CustomerActivity = {
  at: '2026-10-05T15:00:00Z',
  type: 'INSTALLMENT_COLLECTED',
  loanId: 'l1',
  productName: 'Plan Semanal',
  installmentNumber: 3,
  amount: 232840,
  actorName: 'Yesica Aguirre',
  advance: false,
};

describe('historia del cliente', () => {
  it('nombra cobros, adelantos y correcciones', () => {
    expect(activityTitle(base)).toMatch(/^Cuota 3 cobrada · \$\s?232\.840$/);
    expect(activityTitle({ ...base, advance: true })).toContain('(adelanto)');
    expect(activityTitle({ ...base, type: 'INSTALLMENT_REVERTED' })).toBe(
      'Cuota 3 vuelta a pendiente',
    );
  });

  it('el detalle se rotula segun el hecho', () => {
    expect(activityDetail({ ...base, type: 'INSTALLMENT_REVERTED', detail: 'error' })).toBe(
      'Motivo: error',
    );
    expect(activityDetail({ ...base, type: 'LOAN_DISBURSED', detail: 'TRF 1' })).toBe(
      'Referencia: TRF 1',
    );
    expect(activityDetail(base)).toBeNull();
  });
});
