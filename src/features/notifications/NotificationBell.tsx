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
  Switch,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconBell,
  IconCircleCheck,
  IconCircleX,
  IconInfoCircle,
  IconTrash,
  type Icon,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { AppNotification, NotificationTone } from '../../api/types';
import { WhatsAppIcon } from '../../shared/components/WhatsAppButton';
import { formatDate } from '../../shared/format';
import { useNotificationInbox } from './useNotificationInbox';
import {
  useNotificationPreferences,
  unlockAchievementSound,
  playAchievementSound,
} from './notificationPreferences';

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

/**
 * Campana del encabezado: cuantas faltan leer y la lista de las ultimas. Cada aviso se puede borrar;
 * los recordatorios de cobro traen el boton para mandarle el mensaje al cliente por WhatsApp.
 */
export function NotificationBell() {
  const preferences = useNotificationPreferences();
  useEffect(() => {
    if (!preferences.sound) return;
    const unlock = () => unlockAchievementSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [preferences.sound]);
  const { inbox, markRead, markAll, remove, removeRead } = useNotificationInbox();
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();
  const unread = inbox?.unreadCount ?? 0;
  const hasRead = inbox?.items.some((n) => n.read) ?? false;

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
        <Group justify="space-between" px="sm" py="xs" gap="xs">
          <Text fw={700}>Notificaciones</Text>
          <Group gap={4}>
            {unread > 0 && (
              <Button
                size="compact-xs"
                variant="subtle"
                onClick={() => markAll.mutate()}
                loading={markAll.isPending}
              >
                Marcar leídas
              </Button>
            )}
            {hasRead && (
              <Button
                size="compact-xs"
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() => removeRead.mutate()}
                loading={removeRead.isPending}
              >
                Borrar leídas
              </Button>
            )}
          </Group>
        </Group>
        <Stack
          gap="xs"
          px="sm"
          py="xs"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Switch
            label="Avisos emergentes"
            checked={preferences.popups}
            onChange={(e) => preferences.set('popups', e.currentTarget.checked)}
          />
          <Switch
            label="Celebrar objetivos cumplidos"
            checked={preferences.achievements}
            onChange={(e) => preferences.set('achievements', e.currentTarget.checked)}
          />
          <Switch
            label="Sonido de logros"
            checked={preferences.sound}
            onChange={(e) => {
              preferences.set('sound', e.currentTarget.checked);
              if (e.currentTarget.checked) unlockAchievementSound();
            }}
          />
          {preferences.sound && (
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={() => {
                unlockAchievementSound();
                playAchievementSound();
              }}
            >
              Probar sonido
            </Button>
          )}
          <Text size="xs" c="dimmed">
            Preferencias guardadas en este dispositivo. Los avisos siguen en la campana.
          </Text>
        </Stack>
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
                <Group
                  key={n.id}
                  gap={4}
                  wrap="nowrap"
                  align="flex-start"
                  pr={6}
                  style={{
                    borderTop: '1px solid var(--mantine-color-default-border)',
                    background: n.read ? undefined : 'var(--mantine-color-default-hover)',
                  }}
                >
                  <UnstyledButton onClick={() => open(n)} px="sm" py="xs" style={{ flex: 1 }}>
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
                  <Stack gap={4} py="xs">
                    {n.whatsappUrl && (
                      <WhatsAppIcon
                        href={n.whatsappUrl}
                        label="Mandar el recordatorio por WhatsApp"
                        onOpen={() => !n.read && markRead.mutate(n.id)}
                      />
                    )}
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label="Borrar notificación"
                      title="Borrar"
                      onClick={() => remove.mutate(n.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Stack>
                </Group>
              );
            })}
          </Stack>
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
