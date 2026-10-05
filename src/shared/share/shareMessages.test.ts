import { describe, expect, it } from 'vitest';
import type { SimulationResponse } from '../../api/types';
import { offerMessage, simulationMessage } from './shareMessages';

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
  it('la simulacion comparte solo la lista de cuotas', () => {
    expect(norm(simulationMessage(result))).toBe(
      'Cuota 1 · 05/11/2026 · $ 53.020\nCuota 2 · 05/12/2026 · $ 53.020',
    );
  });

  it('la oferta comparte solo las opciones de cuotas, ordenadas', () => {
    expect(
      norm(
        offerMessage('WEEKLY', [
          { installments: 6, installmentAmount: 18460 },
          { installments: 4, installmentAmount: 26910 },
        ]),
      ),
    ).toBe('4 cuotas semanales de $ 26.910\n6 cuotas semanales de $ 18.460');
  });
});
