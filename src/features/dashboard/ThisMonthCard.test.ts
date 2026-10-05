import { describe, expect, it } from 'vitest';
import { monthFigures } from './ThisMonthCard';

describe('monthFigures', () => {
  it('separa lo que puede ganar, lo ganado, lo pagado y lo que rinde', () => {
    const f = monthFigures(100_000, { earnedThisMonth: 4_000, expectedThisMonth: 6_000 });
    expect(f).toEqual({ canEarn: 10_000, earned: 4_000, collected: 100_000, toSettle: 96_000 });
  });

  it('sin cobros no hay nada para rendir', () => {
    expect(monthFigures(0, { earnedThisMonth: 0, expectedThisMonth: 5_000 }).toSettle).toBe(0);
  });
});
