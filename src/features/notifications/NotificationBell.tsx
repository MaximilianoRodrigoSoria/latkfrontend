import {
  ActionIcon,
  Button,
  Group,
  Indicator,
  Popover,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconBell,
  IconCircleCheck,
  IconCircleX,
  IconInfoCircle,
  type Icon,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { AppNotification, NotificationTone } from '../../api/types';
import { formatDate } from '../../shared/format';
import { useNotificationInbox } from './useNotificationInbox';

const LOOK: Record<NotificationTone, { color: string; icon: Icon }> = {
  INFO: { color: 'brand', icon: IconInfoCircle },
  SUCCESS: { color: 'teal', icon: IconCircleCheck },
  WARNING: { color: 'orange', icon: IconAlertTriangle },
  ERROR: { color: 'red', icon: IconCircleX },
};

/** "recien", "hace 5 min", "hace 3 h" o la fecha. */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'recién';
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 24 * 60) return `hace ${Math.floor(minutes / 60)} h`;
  return formatDate(iso);
}

/** Campana del encabezado: cuantas faltan leer y la lista de las ultimas. */
export function NotificationBell() {
  const { inbox, markRead, markAll } = useNotificationInbox();
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();
  const unread = inbox?.unreadCount ?? 0;

  const open = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    setOpened(false);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      width={340}
      shadow="md"
      withinPortal
    >
      <Popover.Target>
        <Indicator
          label={unread > 99 ? '99+' : unread}
          size={18}
          color="red"
          disabled={unread === 0}
          offset={4}
        >
          <ActionIcon
            variant="subtle"
            size="lg"
            aria-label={unread ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
            onClick={() => setOpened((o) => !o)}
          >
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Group justify="space-between" px="sm" py="xs">
          <Text fw={700}>Notificaciones</Text>
          {unread > 0 && (
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={() => markAll.mutate()}
              loading={markAll.isPending}
            >
              Marcar todas como leídas
            </Button>
          )}
        </Group>
        <ScrollArea.Autosize mah={420}>
          {inbox && inbox.items.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="lg">
              No tenés notificaciones.
            </Text>
          )}
          <Stack gap={0}>
            {inbox?.items.map((n) => {
              const look = LOOK[n.tone] ?? LOOK.INFO;
              return (
                <UnstyledButton
                  key={n.id}
                  onClick={() => open(n)}
                  px="sm"
                  py="xs"
                  style={{
                    borderTop: '1px solid var(--mantine-color-default-border)',
                    background: n.read ? undefined : 'var(--mantine-color-default-hover)',
                  }}
                >
                  <Group gap="sm" wrap="nowrap" align="flex-start">
                    <ThemeIcon size={28} radius="xl" variant="light" color={look.color}>
                      <look.icon size={16} />
                    </ThemeIcon>
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" gap="xs" wrap="nowrap">
                        <Text size="sm" fw={n.read ? 500 : 700} truncate>
                          {n.title}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                          {timeAgo(n.createdAt)}
                        </Text>
                      </Group>
                      <Text size="xs" c={n.read ? 'dimmed' : undefined} lineClamp={3}>
                        {n.message}
                      </Text>
                    </Stack>
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
