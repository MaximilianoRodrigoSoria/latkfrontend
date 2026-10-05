import { Button, Card, Group, NumberInput, Progress, SimpleGrid, Stack, Text } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { Quota } from '../../api/types';
import { formatMoneyShort } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';
import { QuotaCard } from './QuotaCard';

/** Cupo del mes de cada vendedor (pantalla del admin). */
export function useAllQuotas(enabled = true) {
  return useQuery({ queryKey: queryKeys.quotas, queryFn: api.quotas, enabled });
}

/** Barra compacta para la lista de vendedores. */
export function QuotaBar({ quota }: { quota: Quota }) {
  return (
    <Stack gap={2}>
      <Group justify="space-between" gap="xs">
        <Text size="xs" c="dimmed">
          Cupo del mes
        </Text>
        <Text size="xs" fw={600}>
          {formatMoneyShort(quota.lent)} / {formatMoneyShort(quota.assigned)} · {quota.lentPercent}{' '}
          %
        </Text>
      </Group>
      <Progress
        value={Math.min(quota.lentPercent, 100)}
        color={quota.usingExtra ? 'orange' : quota.full ? 'teal' : 'brand'}
        size="sm"
        aria-label={`Cupo usado ${quota.lentPercent} %`}
      />
    </Stack>
  );
}

/**
 * Asignar el cupo mensual de un vendedor: cuanto puede prestar por mes y el margen extra que puede
 * usar con aviso. Se repite todos los meses hasta que se cambie.
 */
export function QuotaAdminCard({ sellerId }: { sellerId: string }) {
  const queryClient = useQueryClient();
  const quotas = useAllQuotas();
  const quota = quotas.data?.find((q) => q.sellerId === sellerId);

  const [monthly, setMonthly] = useState<number | string>('');
  const [extra, setExtra] = useState<number | string>('');
  // Al llegar el cupo del servidor se cargan sus valores (una vez).
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loadedKey = quota ? `${quota.assigned}-${quota.extraAllowance}` : 'none';
  if (quotas.data && loadedFor !== loadedKey) {
    setLoadedFor(loadedKey);
    setMonthly(quota?.assigned ?? '');
    setExtra(quota?.extraAllowance ?? '');
  }

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['quota'] });
  const save = useMutation({
    mutationFn: () =>
      api.assignQuota(sellerId, {
        monthlyAmount: Number(monthly),
        extraAllowance: extra === '' ? null : Number(extra),
      }),
    onSuccess: () => {
      refresh();
      notifySuccess('Cupo mensual guardado');
    },
    onError: (error) => notifyError(error),
  });
  const remove = useMutation({
    mutationFn: () => api.removeQuota(sellerId),
    onSuccess: () => {
      refresh();
      notifySuccess('El vendedor quedó sin cupo');
    },
    onError: (error) => notifyError(error),
  });

  const valid = monthly !== '' && Number(monthly) > 0 && (extra === '' || Number(extra) >= 0);
  const unchanged =
    quota !== undefined &&
    Number(monthly) === quota.assigned &&
    Number(extra === '' ? quota.extraAllowance : extra) === quota.extraAllowance;

  return (
    <Stack>
      {quota && <QuotaCard quota={quota} title="Objetivo del mes" />}
      <Card withBorder padding="md">
        <Text fw={700}>Cupo mensual</Text>
        <Text size="xs" c="dimmed" mb="xs">
          Cuánto puede prestar por mes. Se repite todos los meses hasta que lo cambies. Pasado el
          cupo, el vendedor puede usar el margen extra confirmándolo.
        </Text>
        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <NumberInput
            label="Cupo por mes"
            prefix="$ "
            thousandSeparator="."
            decimalSeparator=","
            min={1}
            allowNegative={false}
            value={monthly}
            onChange={setMonthly}
          />
          <NumberInput
            label="Margen extra"
            description="Vacío: el valor por defecto"
            prefix="$ "
            thousandSeparator="."
            decimalSeparator=","
            min={0}
            allowNegative={false}
            value={extra}
            onChange={setExtra}
          />
        </SimpleGrid>
        <Group justify="flex-end" mt="sm">
          {quota && (
            <Button
              variant="subtle"
              color="red"
              onClick={() => remove.mutate()}
              loading={remove.isPending}
            >
              Quitar cupo
            </Button>
          )}
          <Button
            variant="light"
            onClick={() => save.mutate()}
            loading={save.isPending}
            disabled={!valid || unchanged}
          >
            {quota ? 'Guardar' : 'Asignar cupo'}
          </Button>
        </Group>
      </Card>
    </Stack>
  );
}
