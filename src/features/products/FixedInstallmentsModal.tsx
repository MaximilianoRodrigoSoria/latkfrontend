import { Button, Group, Modal, NumberInput, Stack, Table, Text } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { ProductResponse } from '../../api/types';
import { formatMoneyShort } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';

/** Base de la cuota fija: "por cada $10.000". */
export const FIXED_BASE = 10000;

/** Cuota para un monto: proporcional a la de $10.000, redondeada hacia arriba a $10 (como el backend). */
export function fixedInstallmentFor(amount: number, per10k: number): number {
  return Math.ceil(((amount * per10k) / FIXED_BASE - 1e-9) / 10) * 10;
}

/** Interes total del plazo que resulta de la cuota fija (0.32 = 32 %). */
export function fixedInterest(per10k: number, installments: number): number {
  return (per10k * installments) / FIXED_BASE - 1;
}

/**
 * "Fijar cuota" de un producto: por cada cantidad de cuotas habilitada, cuanto se paga por cuota
 * cada $10.000 prestados. Reemplaza la tasa del producto para los prestamos nuevos.
 */
export function FixedInstallmentsModal({
  product,
  opened,
  onClose,
}: {
  product: ProductResponse;
  opened: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const current = product.fixedInstallments ?? {};
  const [values, setValues] = useState<Record<number, number | ''>>(() =>
    Object.fromEntries(product.allowedInstallments.map((n) => [n, current[String(n)] ?? ''])),
  );
  const example = product.allowedAmounts[0] ?? FIXED_BASE;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.offers });
  };
  const save = useMutation({
    mutationFn: (per10k: Record<string, number>) => api.setFixedInstallments(product.id, per10k),
    onSuccess: (_, per10k) => {
      refresh();
      onClose();
      notifySuccess(
        Object.keys(per10k).length > 0
          ? `${product.tierLabel ?? product.name}: cuota fija guardada`
          : `${product.tierLabel ?? product.name}: vuelve a usar la tasa`,
      );
    },
    onError: (error) => notifyError(error),
  });

  const invalid = (n: number) => {
    const v = values[n];
    return v === '' || v === undefined || v * n < FIXED_BASE;
  };
  const complete = product.allowedInstallments.every((n) => !invalid(n));

  return (
    <Modal opened={opened} onClose={onClose} title="Fijar cuota" centered size="lg">
      <Stack>
        <Text size="sm">
          Para cada cantidad de cuotas, cuánto paga el cliente por cuota cada{' '}
          <b>{formatMoneyShort(FIXED_BASE)}</b> prestados. Reemplaza la tasa de{' '}
          <b>{product.tierLabel ?? product.name}</b> en los préstamos nuevos; los que ya existen no
          cambian.
        </Text>
        <Table.ScrollContainer minWidth={420}>
          <Table verticalSpacing={6} fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Cuotas</Table.Th>
                <Table.Th>Cuota cada $10.000</Table.Th>
                <Table.Th>Ej.: {formatMoneyShort(example)}</Table.Th>
                <Table.Th ta="right">Interés del plazo</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {product.allowedInstallments.map((n) => {
                const v = values[n];
                const ok = !invalid(n);
                return (
                  <Table.Tr key={n}>
                    <Table.Td fw={600}>{n}</Table.Td>
                    <Table.Td>
                      <NumberInput
                        aria-label={`Cuota cada $10.000 en ${n} cuotas`}
                        prefix="$ "
                        thousandSeparator="."
                        decimalSeparator=","
                        min={1}
                        allowNegative={false}
                        value={v}
                        error={
                          v !== '' && v !== undefined && !ok
                            ? `Mínimo ${formatMoneyShort(Math.ceil(FIXED_BASE / n))}`
                            : undefined
                        }
                        onChange={(x) =>
                          setValues({ ...values, [n]: typeof x === 'number' ? x : '' })
                        }
                        w={150}
                      />
                    </Table.Td>
                    <Table.Td c="dimmed">
                      {ok
                        ? `${n} de ${formatMoneyShort(fixedInstallmentFor(example, Number(v)))}`
                        : '—'}
                    </Table.Td>
                    <Table.Td ta="right" c="dimmed">
                      {ok ? `${Math.round(fixedInterest(Number(v), n) * 1000) / 10} %` : '—'}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        <Group justify="space-between">
          {Object.keys(current).length > 0 ? (
            <Button
              variant="subtle"
              color="red"
              onClick={() => save.mutate({})}
              loading={save.isPending && save.variables && Object.keys(save.variables).length === 0}
            >
              Quitar cuota fija
            </Button>
          ) : (
            <span />
          )}
          <Group>
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              disabled={!complete}
              loading={save.isPending}
              onClick={() =>
                save.mutate(
                  Object.fromEntries(
                    product.allowedInstallments.map((n) => [String(n), Number(values[n])]),
                  ),
                )
              }
            >
              Guardar
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
