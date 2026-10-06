import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { AppNotification, NotificationInbox, NotificationTone } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { notify, type Tone } from '../../shared/notify';
import { useNotificationPreferences } from './notificationPreferences';

const popup: typeof notify = (options) =>
  useNotificationPreferences.getState().popups ? notify(options) : '';

/** Cada cuanto se consulta el servidor mientras la app esta abierta. */
export const POLL_MS = 20_000;
/** Mas de esta cantidad de avisos nuevos juntos se resumen en uno. */
export const MAX_POPUPS = 3;

const TONE: Record<NotificationTone, Tone> = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

export const toneOf = (n: Pick<AppNotification, 'tone'>): Tone => TONE[n.tone] ?? 'info';

/**
 * Las nuevas desde la ultima consulta que todavia no se leyeron. En la primera carga no hay
 * "nuevas": todo lo existente se toma como ya visto (se resume en un solo aviso).
 */
/** Saca de la bandeja las que cumplen la condicion y recalcula las no leidas. */
export function withoutItems(
  inbox: NotificationInbox,
  drop: (n: AppNotification) => boolean,
): NotificationInbox {
  const removedUnread = inbox.items.filter((n) => drop(n) && !n.read).length;
  return {
    unreadCount: Math.max(0, inbox.unreadCount - removedUnread),
    items: inbox.items.filter((n) => !drop(n)),
  };
}

export function freshNotifications(items: AppNotification[], seen: Set<string>) {
  return items.filter((n) => !n.read && !seen.has(n.id));
}

/**
 * Bandeja de notificaciones: consulta periodica, aviso emergente por cada novedad y acciones de
 * leido. Al llegar algo nuevo refresca prestamos y estadisticas, que probablemente cambiaron.
 */
export function useNotificationInbox() {
  const userId = useAuthStore((s) => s.user?.userId);
  const queryClient = useQueryClient();
  const seen = useRef<Set<string> | null>(null);

  const inbox = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => api.notifications(30),
    enabled: !!userId,
    refetchInterval: POLL_MS,
    // En segundo plano no consulta (bateria y datos en el celular); al volver refresca.
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  // Otro usuario en el mismo dispositivo: empieza de cero.
  useEffect(() => {
    seen.current = null;
  }, [userId]);

  useEffect(() => {
    const data = inbox.data;
    if (!data) return;
    if (seen.current === null) {
      seen.current = new Set(data.items.map((n) => n.id));
      if (data.unreadCount > 0) {
        popup({
          tone: 'info',
          title: 'Notificaciones',
          message: `Tenés ${data.unreadCount} sin leer. Tocá la campana para verlas.`,
          id: 'inbox-summary',
        });
      }
      return;
    }
    const fresh = freshNotifications(data.items, seen.current);
    data.items.forEach((n) => seen.current!.add(n.id));
    if (fresh.length === 0) return;

    // Las mas viejas primero, para que la ultima quede arriba.
    fresh
      .slice(0, MAX_POPUPS)
      .reverse()
      .forEach((n) =>
        popup({
          tone: toneOf(n),
          title: n.title,
          message: n.message,
          link: n.link ?? undefined,
          id: `notification:${n.id}`,
        }),
      );
    if (fresh.length > MAX_POPUPS) {
      popup({
        tone: 'info',
        title: 'Notificaciones',
        message: `Y ${fresh.length - MAX_POPUPS} más en la campana.`,
        id: `inbox-more:${fresh[0]!.id}`,
      });
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.loans });
    void queryClient.invalidateQueries({ queryKey: ['loan'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.portfolioStats });
  }, [inbox.data, queryClient]);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSettled: refresh,
  });
  const markAll = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSettled: refresh,
  });
  // Borrar se ve al instante: se saca de la bandeja antes de que responda el servidor.
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteNotification(id),
    onMutate: (id: string) => {
      queryClient.setQueryData<NotificationInbox>(queryKeys.notifications, (current) =>
        current ? withoutItems(current, (n) => n.id === id) : current,
      );
    },
    onSettled: refresh,
  });
  const removeRead = useMutation({
    mutationFn: () => api.deleteReadNotifications(),
    onMutate: () => {
      queryClient.setQueryData<NotificationInbox>(queryKeys.notifications, (current) =>
        current ? withoutItems(current, (n) => n.read) : current,
      );
    },
    onSettled: refresh,
  });

  return { inbox: inbox.data, isLoading: inbox.isLoading, markRead, markAll, remove, removeRead };
}
