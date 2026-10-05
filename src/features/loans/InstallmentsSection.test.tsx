import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/endpoints';
import type { InstallmentResponse, LoanResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { InstallmentsSection } from './InstallmentsSection';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const row = (
  number: number,
  dueDate: string,
  status: InstallmentResponse['status'],
): InstallmentResponse => ({
  number,
  dueDate,
  amount: 27550,
  principal: 25000,
  interest: 2550,
  remainingBalance: 100000 - number * 25000,
  status,
  overdue: status === 'PENDING' && dueDate < '2026-10-05',
  collectedAt: status === 'COLLECTED' ? '2026-10-05T12:00:00Z' : null,
  collectedByName: status === 'COLLECTED' ? 'Vendedor Uno' : null,
});

const loan = (schedule: InstallmentResponse[]): LoanResponse => ({
  id: 'l1',
  sellerName: 'Vendedor Uno',
  customerId: 'c1',
  customerName: 'Juan Perez',
  customerDni: '30123456',
  productName: 'Mensual',
  frequency: 'MONTHLY',
  ratePerPeriod: 0.1,
  principal: 100000,
  installments: 4,
  installmentAmount: 27550,
  totalToRepay: 110200,
  status: 'DISBURSED',
  requestedAt: '2026-09-01T12:00:00Z',
  autoApproved: true,
  schedule,
  history: [],
});

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

const renderSection = (l: LoanResponse) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <InstallmentsSection loan={l} />
      </MantineProvider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.restoreAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-05T12:00:00'));
});

describe('InstallmentsSection', () => {
  it('el vendedor adelanta la proxima cuota si todavia no vence', async () => {
    signInWith(['collection.register']);
    const collect = vi.spyOn(api, 'collectInstallment').mockResolvedValue(loan([]));
    renderSection(
      loan([
        row(1, '2026-10-01', 'COLLECTED'),
        row(2, '2026-11-01', 'PENDING'),
        row(3, '2026-12-01', 'PENDING'),
      ]),
    );

    fireEvent.click(screen.getByRole('button', { name: /Adelantar cuota 2/ }));
    expect(await screen.findByText(/queda registrada como adelanto/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cobrada' }));

    await waitFor(() => expect(collect).toHaveBeenCalledWith('l1', 2));
    expect(screen.queryByRole('button', { name: /no cobrada/i })).toBeNull();
  });

  it('una cuota vencida se cobra y se marca como vencida', () => {
    signInWith(['collection.register']);
    renderSection(loan([row(1, '2026-09-20', 'PENDING'), row(2, '2026-10-20', 'PENDING')]));

    expect(screen.getByRole('button', { name: /Cobrar cuota 1/ })).toBeTruthy();
    expect(screen.getByText('Vencida')).toBeTruthy();
  });

  it('el admin revierte solo la ultima cobrada y con motivo', async () => {
    signInWith(['collection.register', 'collection.revert']);
    const revert = vi.spyOn(api, 'revertInstallment').mockResolvedValue(loan([]));
    renderSection(
      loan([
        row(1, '2026-09-01', 'COLLECTED'),
        row(2, '2026-10-01', 'COLLECTED'),
        row(3, '2026-11-01', 'PENDING'),
      ]),
    );

    const buttons = screen.getAllByRole('button', { name: /no cobrada/i });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]!);

    const reason = await screen.findByLabelText(/Motivo/);
    const confirm = screen.getByRole('button', { name: 'Corregir' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(reason, { target: { value: 'Se cargo por error' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(revert).toHaveBeenCalledWith('l1', 2, 'Se cargo por error'));
  });

  it('sin permiso de cobro no hay boton', () => {
    signInWith(['loan.read.all']);
    renderSection(loan([row(1, '2026-10-20', 'PENDING')]));
    expect(screen.queryByRole('button', { name: /cuota 1/ })).toBeNull();
  });
});
