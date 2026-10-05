import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { OfferOption } from '../../api/types';
import { LoanAmountCard } from './LoanAmountCard';

const options: OfferOption[] = [
  { amount: 100000, installments: 6, installmentAmount: 19080, totalToRepay: 114480 },
  { amount: 100000, installments: 4, installmentAmount: 27550, totalToRepay: 110200 },
];

const renderCard = (earnings?: OfferOption[]) =>
  render(
    <MantineProvider>
      <LoanAmountCard frequency="MONTHLY" amount={100000} options={options} earnings={earnings} />
    </MantineProvider>,
  );

const cells = (row: HTMLElement) =>
  Array.from(row.querySelectorAll('td')).map((c) => c.textContent?.replace(/\s/g, ' '));

describe('LoanAmountCard', () => {
  it('sin ganancia: tabla de cuotas y valor, ordenada y sin centavos', () => {
    renderCard();
    expect(screen.getByText('Valor cuota')).toBeTruthy();
    expect(screen.queryByText('Ganas total')).toBeNull();
    const rows = screen.getAllByRole('row').slice(1);
    expect(cells(rows[0]!)).toEqual(['4', '$ 27.550']);
    expect(cells(rows[1]!)).toEqual(['6', '$ 19.080']);
  });

  it('con ganancia: agrega columnas por cuota y total del prestamo', () => {
    renderCard(
      options.map((o) => ({
        ...o,
        commissionPerInstallment: o.installments === 4 ? 1377.5 : 954,
        totalCommission: o.installments === 4 ? 5510 : 5724,
      })),
    );
    expect(screen.getByText('Ganas x cuota')).toBeTruthy();
    expect(screen.getByText('Ganas total')).toBeTruthy();
    const rows = screen.getAllByRole('row').slice(1);
    expect(cells(rows[0]!)).toEqual(['4', '$ 27.550', '$ 1.377,50', '$ 5.510,00']);
  });

  it('si el backend no informa el total, lo calcula por cuota x cantidad', () => {
    renderCard(options.map((o) => ({ ...o, commissionPerInstallment: 477 })));
    const rows = screen.getAllByRole('row').slice(1);
    expect(cells(rows[0]!)).toEqual(['4', '$ 27.550', '$ 477,00', '$ 1.908,00']);
  });
});
