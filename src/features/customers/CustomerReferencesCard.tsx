import { ActionIcon, Anchor, Badge, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconPhone, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import { Foldable } from '../../shared/components/Foldable';
import { notifyError } from '../../shared/notify';

const MAX_REFERENCES = 5;
const EMPTY = { fullName: '', phone: '', relationship: '' };

/** Contactos de referencia del cliente (opcionales, hasta cinco). */
export function CustomerReferencesCard({
  customerId,
  canWrite,
}: {
  customerId: string;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const key = queryKeys.customerReferences(customerId);
  const references = useQuery({ queryKey: key, queryFn: () => api.customerReferences(customerId) });
  const [form, setForm] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: key });

  const add = useMutation({
    mutationFn: () =>
      api.addCustomerReference(customerId, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        relationship: form.relationship.trim(),
      }),
    onSuccess: () => {
      setForm(EMPTY);
      setAdding(false);
      refresh();
    },
    onError: (error) => notifyError(error),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.removeCustomerReference(customerId, id),
    onSuccess: refresh,
    onError: (error) => notifyError(error),
  });

  const list = references.data ?? [];
  const valid =
    form.fullName.trim().length >= 2 &&
    form.relationship.trim().length >= 2 &&
    form.phone.replace(/\D/g, '').length >= 6;

  return (
    <Foldable
      title="Referencias"
      aside={
        list.length > 0 ? (
          <Badge variant="light" color="gray">
            {list.length}
          </Badge>
        ) : undefined
      }
    >
      <Stack gap="sm">
        {list.length === 0 && references.data && (
          <Text size="sm" c="dimmed">
            Sin referencias cargadas.
          </Text>
        )}
        {list.map((r) => (
          <Group key={r.id} justify="space-between" wrap="nowrap">
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text size="sm" fw={600} truncate>
                {r.fullName}
              </Text>
              <Text size="xs" c="dimmed">
                {r.relationship} ·{' '}
                <Anchor href={`tel:${r.phone}`} size="xs">
                  <IconPhone size={12} /> {r.phone}
                </Anchor>
              </Text>
            </Stack>
            {canWrite && (
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`Quitar a ${r.fullName}`}
                loading={remove.isPending && remove.variables === r.id}
                onClick={() => remove.mutate(r.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            )}
          </Group>
        ))}

        {canWrite && list.length < MAX_REFERENCES && !adding && (
          <Button size="xs" variant="light" w="fit-content" onClick={() => setAdding(true)}>
            Agregar referencia
          </Button>
        )}
        {adding && (
          <Stack gap={6}>
            <TextInput
              label="Nombre"
              value={form.fullName}
              maxLength={80}
              onChange={(e) => setForm({ ...form, fullName: e.currentTarget.value })}
            />
            <Group grow>
              <TextInput
                label="Vínculo"
                placeholder="Hermana, vecino..."
                value={form.relationship}
                maxLength={40}
                onChange={(e) => setForm({ ...form, relationship: e.currentTarget.value })}
              />
              <TextInput
                label="Teléfono"
                inputMode="tel"
                value={form.phone}
                maxLength={25}
                onChange={(e) => setForm({ ...form, phone: e.currentTarget.value })}
              />
            </Group>
            <Group justify="flex-end">
              <Button size="xs" variant="default" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
              <Button
                size="xs"
                disabled={!valid}
                loading={add.isPending}
                onClick={() => add.mutate()}
              >
                Guardar
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Foldable>
  );
}
