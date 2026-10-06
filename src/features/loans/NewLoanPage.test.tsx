import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/endpoints';
import { ApiError } from '../../api/http';
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
      productName: 'Oro',
      frequency: 'WEEKLY',
      tier: 'GOLD',
      tierLabel: 'Oro',
      sellerVisible: true,
      options: [
        { amount: 95000, installments: 4, installmentAmount: 25570, totalToRepay: 102280 },
        { amount: 95000, installments: 6, installmentAmount: 17540, totalToRepay: 105240 },
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

/** Elige la categoria (arranca en el monto maximo) y desliza las cuotas de 4 a 6. */
async function chooseGold6() {
  fireEvent.click(await screen.findByRole('button', { name: 'Categoría Oro' }));
  expect(screen.getByText(/máx\. \$\s100\.000/)).toBeTruthy();
  const cuotas = screen.getByRole('slider', { name: 'Cuotas' });
  fireEvent.keyDown(cuotas, { key: 'ArrowRight' });
}

describe('NewLoanPage', () => {
  it('arma la solicitud paso a paso y la envia confirmada', async () => {
    const create = vi
      .spyOn(api, 'createLoan')
      .mockResolvedValue({ ...loan('c1', 'REQUESTED'), id: 'nuevo', customerName: 'Juan Perez' });
    renderPage();

    await chooseGold6();

    expect(screen.getByText('Total a devolver')).toBeTruthy();
    expect(screen.getByText('$ 110.760')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Solicitar préstamo/ }));
    expect(await screen.findByText('Juan Perez')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        {
          customerId: 'c1',
          productId: 'p1',
          amount: 100000,
          installments: 6,
          notes: null,
          useExtraQuota: false,
        },
        expect.anything(),
      ),
    );
    expect(await screen.findByText('detalle')).toBeTruthy();
  });

  it('si supera el cupo ofrece pedirlo con el margen extra', async () => {
    const create = vi
      .spyOn(api, 'createLoan')
      .mockRejectedValueOnce(
        new ApiError({
          status: 409,
          title: 'Conflicto',
          detail: 'Supera tu cupo',
          code: 'QUOTA_EXCEEDED',
          remaining: 50000,
          extraRemaining: 100000,
        }),
      )
      .mockResolvedValueOnce({ ...loan('c1', 'REQUESTED'), id: 'nuevo', customerName: 'Juan' });
    renderPage();

    await chooseGold6();
    fireEvent.click(screen.getByRole('button', { name: /Solicitar préstamo/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('Superás tu cupo del mes')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pedir con margen extra' }));

    await waitFor(() =>
      expect(create).toHaveBeenLastCalledWith(
        expect.objectContaining({ useExtraQuota: true }),
        expect.anything(),
      ),
    );
    expect(await screen.findByText('detalle')).toBeTruthy();
  });

  it('no deja enviar sin elegir la categoria', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Categoría Oro' });
    expect(
      (screen.getByRole('button', { name: /Solicitar préstamo/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
