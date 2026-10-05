import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/endpoints';
import type { EarningsResponse } from '../../api/types';
import { EarningsPage, monthLabel } from './EarningsPage';

const report: EarningsResponse = {
  currentMonth: '2026-10',
  earnedThisMonth: 4132.5,
  expectedThisMonth: 10089,
  earnedTotal: 4132.5,
  pendingTotal: 14829.5,
  months: [
    {
      month: '2026-10',
      earned: 4132.5,
      expected: 10089,
      installmentsCollected: 3,
      installmentsPending: 3,
    },
    {
      month: '2026-11',
      earned: 0,
      expected: 3363,
      installmentsCollected: 0,
      installmentsPending: 1,
    },
  ],
  loans: [
    {
      loanId: 'l1',
      customerName: 'Carlos Diaz',
      principal: 100000,
      status: 'DISBURSED',
      installments: 4,
      installmentsCollected: 3,
      perInstallment: 1377.5,
      earned: 4132.5,
      pending: 1377.5,
    },
  ],
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <MemoryRouter>
          <EarningsPage />
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );

beforeEach(() => vi.restoreAllMocks());

describe('EarningsPage', () => {
  it('formatea el mes en castellano', () => {
    expect(monthLabel('2026-10')).toBe('octubre 2026');
  });

  it('oculta todo hasta confirmar la contrasena y despues muestra mes, acumulado y prestamos', async () => {
    const reveal = vi.spyOn(api, 'myEarnings').mockResolvedValue(report);
    renderPage();

    expect(screen.getByText('Tus ganancias están ocultas')).toBeTruthy();
    expect(screen.queryByText('Carlos Diaz')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Ver mis ganancias/ }));
    fireEvent.change(await screen.findByLabelText(/Contrasena/), {
      target: { value: 'vendedor1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar ganancia' }));

    await waitFor(() => expect(reveal).toHaveBeenCalled());
    expect(reveal.mock.calls[0]![0]).toBe('vendedor1234');
    expect(await screen.findByText('Carlos Diaz')).toBeTruthy();
    expect(screen.getByText(/Te faltan cobrar \$\s?10\.089,00 este mes/)).toBeTruthy();
    expect(screen.getByText(/\$\s?1\.377,50 por cuota/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Ocultar/ }));
    expect(screen.getByText('Tus ganancias están ocultas')).toBeTruthy();
  });
});
