import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/endpoints';
import type { AppNotification, NotificationInbox } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { notify } from '../../shared/notify';
import { NotificationBell, timeAgo } from './NotificationBell';
import { freshNotifications, toneOf, withoutItems } from './useNotificationInbox';

vi.mock('../../shared/notify', () => ({ notify: vi.fn(), setNotifyNavigator: vi.fn() }));

const item = (id: string, read = false): AppNotification => ({
  id,
  type: 'LOAN_APPROVED',
  tone: 'SUCCESS',
  title: `Aviso ${id}`,
  message: `Mensaje ${id}`,
  link: '/loans/l1',
  createdAt: new Date().toISOString(),
  read,
});

describe('notificaciones: logica', () => {
  it('nuevas = no leidas y no vistas', () => {
    const fresh = freshNotifications([item('a'), item('b', true), item('c')], new Set(['a']));
    expect(fresh.map((n) => n.id)).toEqual(['c']);
  });

  it('sacar de la bandeja recalcula las no leidas', () => {
    const inbox = { unreadCount: 2, items: [item('a'), item('b', true), item('c')] };
    expect(withoutItems(inbox, (n) => n.id === 'a')).toEqual({
      unreadCount: 1,
      items: [item('b', true), item('c')].map((n) => ({ ...n, createdAt: expect.any(String) })),
    });
    expect(withoutItems(inbox, (n) => n.read).unreadCount).toBe(2);
  });

  it('tono y tiempo relativo', () => {
    expect(toneOf({ tone: 'WARNING' })).toBe('warning');
    const now = Date.parse('2026-10-05T12:00:00Z');
    expect(timeAgo('2026-10-05T11:59:40Z', now)).toBe('recién');
    expect(timeAgo('2026-10-05T11:45:00Z', now)).toBe('hace 15 min');
    expect(timeAgo('2026-10-05T09:00:00Z', now)).toBe('hace 3 h');
  });
});

describe('NotificationBell', () => {
  let inbox: NotificationInbox;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(notify).mockClear();
    useAuthStore.setState({
      token: 't',
      user: {
        userId: 'u1',
        username: 'u',
        fullName: 'U',
        roles: [],
        permissions: [],
        expiresAt: Date.now() + 60_000,
      },
    });
    inbox = { unreadCount: 1, items: [item('a')] };
    vi.spyOn(api, 'notifications').mockImplementation(() => Promise.resolve(inbox));
  });

  const renderBell = (client = new QueryClient()) =>
    render(
      <QueryClientProvider client={client}>
        <MantineProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<NotificationBell />} />
              <Route path="/loans/:id" element={<p>detalle prestamo</p>} />
            </Routes>
          </MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>,
    );

  it('muestra cuantas faltan leer y al abrir una navega y la marca', async () => {
    const markRead = vi.spyOn(api, 'markNotificationRead').mockResolvedValue(undefined);
    renderBell();

    const bell = await screen.findByRole('button', { name: 'Notificaciones: 1 sin leer' });
    // Primera carga: un solo resumen, no un aviso por cada una vieja.
    await waitFor(() => expect(notify).toHaveBeenCalledTimes(1));
    expect(vi.mocked(notify).mock.calls[0]![0].id).toBe('inbox-summary');

    fireEvent.click(bell);
    fireEvent.click(await screen.findByText('Aviso a'));

    await waitFor(() => expect(markRead).toHaveBeenCalledWith('a'));
    expect(await screen.findByText('detalle prestamo')).toBeTruthy();
  });

  it('una notificacion nueva aparece como aviso emergente', async () => {
    const client = new QueryClient();
    renderBell(client);
    await screen.findByRole('button', { name: 'Notificaciones: 1 sin leer' });

    inbox = { unreadCount: 2, items: [item('b'), item('a')] };
    await act(() => client.refetchQueries({ queryKey: ['notifications'] }));

    await waitFor(() =>
      expect(vi.mocked(notify).mock.calls.some(([o]) => o.id === 'notification:b')).toBe(true),
    );
  });

  it('se puede borrar una y el recordatorio trae WhatsApp', async () => {
    const remove = vi.spyOn(api, 'deleteNotification').mockResolvedValue(undefined);
    inbox = {
      unreadCount: 1,
      items: [
        { ...item('r'), type: 'INSTALLMENT_DUE_TODAY', whatsappUrl: 'https://wa.me/549?text=Hola' },
      ],
    };
    renderBell();
    fireEvent.click(await screen.findByRole('button', { name: 'Notificaciones: 1 sin leer' }));

    const wa = await screen.findByRole('link', { name: 'Mandar el recordatorio por WhatsApp' });
    expect(wa.getAttribute('href')).toBe('https://wa.me/549?text=Hola');
    expect(wa.getAttribute('target')).toBe('_blank');

    const trash = await screen.findByLabelText('Borrar notificación');
    inbox = { unreadCount: 0, items: [] };
    fireEvent.click(trash);
    await waitFor(() => expect(remove).toHaveBeenCalledWith('r'));
    expect(await screen.findByText('No tenés notificaciones.')).toBeTruthy();
  });
});
