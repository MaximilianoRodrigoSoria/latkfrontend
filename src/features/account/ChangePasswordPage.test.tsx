import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../../api/endpoints';
import { ChangePasswordPage } from './ChangePasswordPage';

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <MemoryRouter>
          <ChangePasswordPage />
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('ChangePasswordPage', () => {
  it('envia la actual y la nueva', async () => {
    const spy = vi.spyOn(api, 'changePassword').mockResolvedValue(undefined);
    const current = 'a'.repeat(10);
    const next = 'b'.repeat(10);
    renderPage();
    type('Contraseña actual', current);
    type('Contraseña nueva', next);
    type('Repetí la contraseña nueva', next);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ currentPassword: current, newPassword: next }),
    );
  });

  it('no envia si la confirmacion no coincide', async () => {
    const spy = vi.spyOn(api, 'changePassword').mockResolvedValue(undefined);
    renderPage();
    type('Contraseña actual', 'a'.repeat(10));
    type('Contraseña nueva', 'b'.repeat(10));
    type('Repetí la contraseña nueva', 'c'.repeat(10));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Las contraseñas no coinciden')).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });
});
