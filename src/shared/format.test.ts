import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, formatRate } from './format';

describe('format', () => {
  it('formatea pesos argentinos con dos decimales', () => {
    expect(formatMoney(10655.22).replace(/\s/g, ' ')).toBe('$ 10.655,22');
  });

  it('muestra la tasa por periodo como porcentaje', () => {
    expect(formatRate(0.01)).toBe('1 %');
    expect(formatRate(0.0125)).toBe('1,25 %');
  });

  it('formatea fechas ISO como DD/MM/YYYY', () => {
    expect(formatDate('2026-11-05')).toBe('05/11/2026');
  });
});
