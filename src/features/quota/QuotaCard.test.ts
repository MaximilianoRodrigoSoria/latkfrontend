import { describe, expect, it } from 'vitest';
import type { Quota } from '../../api/types';
import { monthName, quotaLook } from './QuotaCard';

const base: Quota = {
  sellerId: 's1',
  month: '2026-10',
  assigned: 1_000_000,
  extraAllowance: 100_000,
  lent: 500_000,
  remaining: 500_000,
  extraRemaining: 100_000,
  lentPercent: 50,
  loans: 2,
  toRepay: 1_075_400,
  repaid: 0,
  full: false,
  usingExtra: false,
  fullyRepaid: false,
};

describe('cupo mensual', () => {
  it('nombra el mes en castellano', () => {
    expect(monthName('2026-10')).toBe('octubre');
  });

  it('el estado se dice en palabras, no solo con color', () => {
    expect(quotaLook(base).label).toBe('En curso');
    expect(quotaLook({ ...base, lentPercent: 80 }).label).toBe('Casi completo');
    expect(quotaLook({ ...base, full: true, lentPercent: 100 }).label).toBe('Cumplido');
    expect(quotaLook({ ...base, full: true, usingExtra: true, lentPercent: 110 })).toEqual({
      color: 'orange',
      label: 'Margen extra',
    });
  });
});
