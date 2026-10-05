import { describe, expect, it } from 'vitest';
import type { SimulationResponse } from '../../api/types';
import { simulationMessage } from './shareMessages';

const result: SimulationResponse = {
  principal: 100000,
  ratePerPeriod: 0.04,
  frequency: 'MONTHLY',
  installments: 2,
  installmentAmount: 53020,
  totalToRepay: 106040,
  totalInterest: 6040,
  schedule: [
    {
      number: 1,
      dueDate: '2026-11-05',
      amount: 53020,
      principal: 49020,
      interest: 4000,
      remainingBalance: 50980,
    },
    {
      number: 2,
      dueDate: '2026-12-05',
      amount: 53020,
      principal: 50980,
      interest: 2040,
      remainingBalance: 0,
    },
  ],
};

const norm = (s: string) => s.replace(/\u00a0/g, ' ');

describe('shareMessages', () => {
  it('la simulacion lleva saludo, monto, cuotas, total y la lista de vencimientos', () => {
    const text = norm(simulationMessage(result));
    expect(text).toContain('¡Hola!');
    expect(text).toContain('Te prestamos: *$ 100.000*');
    expect(text).toContain('2 cuotas mensuales de *$ 53.020*');
    expect(text).toContain('Total a devolver: $ 106.040');
    expect(text).toContain('• Cuota 1 · 05/11/2026 · $ 53.020\n• Cuota 2 · 05/12/2026 · $ 53.020');
    // Nunca la tasa ni el interes.
    expect(text).not.toMatch(/tasa|inter[eé]s|%/i);
  });
});
