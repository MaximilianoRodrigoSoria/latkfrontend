import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/endpoints';
import type { LoanResponse } from '../../api/types';
import { NewLoanPage } from './NewLoanPage';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const loan = (customerId: string, status: LoanResponse['status']): LoanResponse => ({
  id: `l-${customerId}`,
  sellerName: 'Vendedor Uno',
  autoApproved: false,
  customerId,
  customerName: 'X',
  customerDni: null,
  productName: 'Semanal',
  frequency: 'WEEKLY',
  ratePerPeriod: 0.03,
  principal: 50000,
  installments: 4,
  installmentAmount: 13460,
  totalToRepay: 53840,
  status,
  requestedAt: '2026-10-01T12:00:00Z',
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'customers').mockResolvedValue([
    { id: 'c1', fullName: 'Juan Perez', dni: '30123456', phone: '11', city: 'CABA' },
  ]);
  vi.spyOn(api, 'loans').mockResolvedValue([loan('c2', 'REQUESTED')]);
  vi.spyOn(api, 'offers').mockResolvedValue([
    {
      productId: 'p1',
      productName: 'Semanal',
      frequency: 'WEEKLY',
      ratePerPeriod: 0.03,
      options: [
        { amount: 100000, installments: 4, installmentAmount: 26910, totalToRepay: 107640 },
        { amount: 100000, installments: 6, installmentAmount: 18460, totalToRepay: 110760 },
      ],
    },
  ]);
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <MemoryRouter initialEntries={['/loans/new?customerId=c1']}>
          <Routes>
            <Route path="/loans/new" element={<NewLoanPage />} />
            <Route path="/loans/:id" element={<p>detalle</p>} />
          </Routes>
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );

describe('NewLoanPage', () => {
  it('arma la solicitud paso a paso y la envia confirmada', async () => {
    const create = vi
      .spyOn(api, 'createLoan')
      .mockResolvedValue({ ...loan('c1', 'REQUESTED'), id: 'nuevo', customerName: 'Juan Perez' });
    renderPage();

    fireEvent.click(await screen.findByText(/Semanal · Semanal/));
    fireEvent.click(await screen.findByText('$ 100.000'));
    fireEvent.click(await screen.findByText('6 cuotas de $ 18.460'));

    expect(screen.getByText('Total a devolver')).toBeTruthy();
    expect(screen.getByText('$ 110.760')).toBeTruthy();
    expect(screen.getByText('Juan Perez')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Solicitar préstamo/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        { customerId: 'c1', productId: 'p1', amount: 100000, installments: 6, notes: null },
        expect.anything(),
      ),
    );
    expect(await screen.findByText('detalle')).toBeTruthy();
  });

  it('no deja enviar sin elegir cuotas', async () => {
    renderPage();
    fireEvent.click(await screen.findByText(/Semanal · Semanal/));
    expect(
      (screen.getByRole('button', { name: /Solicitar préstamo/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
