import { ActionIcon, Badge, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconBellPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import { Foldable } from '../../shared/components/Foldable';
import { formatDate } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';

/**
 * "Recordarme": una visita o llamada para un dia. Ese dia llega a la campanita. Son personales:
 * cada usuario ve solo los suyos. Plegado, con la proxima fecha como dato breve.
 */
export function CustomerRemindersCard({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const reminders = useQuery({
    queryKey: queryKeys.customerReminders(customerId),
    queryFn: () => api.customerReminders(customerId),
  });
  const [date, setDate] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.customerReminders(customerId) });

  const add = useMutation({
    mutationFn: () => api.scheduleCustomerReminder(customerId, date!, note.trim() || null),
    onSuccess: (r) => {
      setDate(null);
      setNote('');
      refresh();
      const today = r.remindOn === dayjs().format('YYYY-MM-DD');
      if (today) void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      notifySuccess(
        today
          ? 'Recordatorio para hoy: ya está en la campanita'
          : `Te lo recordamos el ${formatDate(r.remindOn)}`,
      );
    },
    onError: (error) => notifyError(error),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.cancelCustomerReminder(customerId, id),
    onSuccess: refresh,
    onError: (error) => notifyError(error),
  });

  const list = reminders.data ?? [];
  return (
    <Foldable
      title="Recordatorios"
      aside={
        list.length > 0 ? (
          <Badge variant="light" color="brand">
            {formatDate(list[0]!.remindOn)}
          </Badge>
        ) : undefined
      }
    >
      <Stack gap="sm">
        <Group align="flex-end" gap="xs" wrap="wrap">
          <DateInput
            label="Recordarme el"
            placeholder="Elegí el día"
            valueFormat="DD/MM/YYYY"
            minDate={dayjs().format('YYYY-MM-DD')}
            maxDate={dayjs().add(1, 'year').format('YYYY-MM-DD')}
            value={date}
            onChange={setDate}
            style={{ flex: '1 1 140px' }}
          />
          <TextInput
            label="Para qué (opcional)"
            placeholder="Ej.: pasar a cobrar"
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            style={{ flex: '2 1 180px' }}
          />
        </Group>
        <Group justify="flex-end">
          <Button
            size="xs"
            variant="light"
            leftSection={<IconBellPlus size={16} />}
            disabled={!date}
            loading={add.isPending}
            onClick={() => add.mutate()}
          >
            Recordarme
          </Button>
        </Group>
        {list.map((r) => (
          <Group
            key={r.id}
            justify="space-between"
            wrap="nowrap"
            pt="xs"
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text size="sm" fw={600}>
                {formatDate(r.remindOn)}
              </Text>
              <Text size="sm">{r.note}</Text>
            </Stack>
            <ActionIcon
              variant="subtle"
              color="red"
              aria-label={`Quitar recordatorio del ${formatDate(r.remindOn)}`}
              loading={remove.isPending && remove.variables === r.id}
              onClick={() => remove.mutate(r.id)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
      </Stack>
    </Foldable>
  );
}
