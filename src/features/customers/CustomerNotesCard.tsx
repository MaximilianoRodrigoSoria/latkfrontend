import { Badge, Button, Group, Stack, Text, Textarea } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import { Foldable } from '../../shared/components/Foldable';
import { formatDateTime } from '../../shared/format';
import { notifyError } from '../../shared/notify';

const MAX = 500;

/** Bitacora de notas del cliente ("paga los viernes"): fecha y autor, sin editar ni borrar. */
export function CustomerNotesCard({
  customerId,
  canWrite,
}: {
  customerId: string;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const notes = useQuery({
    queryKey: queryKeys.customerNotes(customerId),
    queryFn: () => api.customerNotes(customerId),
  });
  const [text, setText] = useState('');
  const add = useMutation({
    mutationFn: () => api.addCustomerNote(customerId, text.trim()),
    onSuccess: () => {
      setText('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.customerNotes(customerId) });
    },
    onError: (error) => notifyError(error),
  });
  const count = notes.data?.length ?? 0;

  return (
    <Foldable
      title="Notas"
      aside={
        count > 0 ? (
          <Badge variant="light" color="gray">
            {count}
          </Badge>
        ) : undefined
      }
    >
      <Stack gap="sm">
        {canWrite && (
          <Stack gap={6}>
            <Textarea
              placeholder="Ej.: paga los viernes, cambió de domicilio"
              autosize
              minRows={2}
              maxLength={MAX}
              value={text}
              onChange={(e) => setText(e.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button
                size="xs"
                variant="light"
                disabled={!text.trim()}
                loading={add.isPending}
                onClick={() => add.mutate()}
              >
                Agregar nota
              </Button>
            </Group>
          </Stack>
        )}
        {count === 0 && notes.data && (
          <Text size="sm" c="dimmed">
            Todavía no hay notas.
          </Text>
        )}
        {notes.data?.map((note) => (
          <Stack
            key={note.id}
            gap={2}
            pt="xs"
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {note.text}
            </Text>
            <Text size="xs" c="dimmed">
              {formatDateTime(note.createdAt)} · {note.authorName}
            </Text>
          </Stack>
        ))}
      </Stack>
    </Foldable>
  );
}
