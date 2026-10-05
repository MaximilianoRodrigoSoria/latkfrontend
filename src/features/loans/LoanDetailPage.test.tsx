import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/endpoints';
import type { LoanResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { LoanDetailPage } from './LoanDetailPage';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const pending: LoanResponse = {
  id: 'l1',
  sellerName: 'Vendedor Uno',
  customerId: 'c1',
  customerName: 'Juan Perez',
  customerDni: '30123456',
  productName: 'Mensual',
  frequency: 'MONTHLY',
  ratePerPeriod: 0.1,
  principal: 250000,
  installments: 4,
  installmentAmount: 78870,
  totalToRepay: 315480,
  status: 'REQUESTED',
  requestedAt: '2026-10-05T12:00:00Z',
  autoApproved: false,
  estimatedSchedule: [],
};

const signInWith = (permissions: string[]) =>
  useAuthStore.setState({
    token: 't',
    user: {
      userId: 'u',
      username: 'u',
      fullName: 'U',
      roles: [],
      permissions,
      expiresAt: Date.now() + 60_000,
    },
  });

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <MemoryRouter initialEntries={['/loans/l1']}>
          <Routes>
            <Route path="/loans/:id" element={<LoanDetailPage />} />
          </Routes>
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );

beforeEach(() => vi.restoreAllMocks());

describe('LoanDetailPage', () => {
  it('quien aprueba ve las acciones y puede aprobar', async () => {
    signInWith(['loan.approve', 'loan.read.all']);
    vi.spyOn(api, 'loan').mockResolvedValue(pending);
    const approve = vi.spyOn(api, 'approveLoan').mockResolvedValue({
      ...pending,
      status: 'APPROVED',
      decidedByName: 'Admin LATK',
      decidedAt: '2026-10-05T13:00:00Z',
    });
    renderPage();

    expect(await screen.findByText('Pendiente de tu aprobación')).toBeTruthy();
    expect(screen.getByText(/por Vendedor Uno/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar aprobación' }));

    await waitFor(() => expect(approve).toHaveBeenCalledWith('l1'));
    expect(await screen.findByText(/Por Admin LATK/)).toBeTruthy();
  });

  it('rechazar exige motivo', async () => {
    signInWith(['loan.approve', 'loan.read.all']);
    vi.spyOn(api, 'loan').mockResolvedValue(pending);
    const reject = vi
      .spyOn(api, 'rejectLoan')
      .mockResolvedValue({ ...pending, status: 'REJECTED', decisionReason: 'Sin ingresos' });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
    const reason = await screen.findByLabelText(/Motivo/);
    const confirm = screen.getByRole('button', { name: 'Confirmar rechazo' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(reason, { target: { value: 'Sin ingresos' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(reject).toHaveBeenCalledWith('l1', 'Sin ingresos'));
    expect(await screen.findByText('Motivo: Sin ingresos')).toBeTruthy();
  });

  it('el vendedor ve el estado pero no las acciones', async () => {
    signInWith(['loan.read.own']);
    vi.spyOn(api, 'loan').mockResolvedValue(pending);
    renderPage();

    expect(
      await screen.findByText(
        'El administrador tiene que aprobarlo antes de transferir el dinero.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull();
    expect(screen.queryByText(/Vendedor Uno/)).toBeNull();
  });

  it('muestra la regla de una aprobacion automatica', async () => {
    signInWith(['loan.read.own']);
    vi.spyOn(api, 'loan').mockResolvedValue({
      ...pending,
      principal: 100000,
      status: 'APPROVED',
      autoApproved: true,
      decisionReason: 'Aprobacion automatica: monto menor a $ 201.000',
    });
    renderPage();

    expect(await screen.findByText('Aprobado automáticamente')).toBeTruthy();
    expect(screen.getByText(/monto menor a \$ 201.000/)).toBeTruthy();
  });
});
