import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Progress,
  Stack,
  Text,
  Textarea,
  Timeline,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowBackUp, IconCash, IconCheck, IconPlayerTrackNext } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { InstallmentResponse, LoanResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, isSeller, Permission } from '../../auth/permissions';
import { CollectionAccountCard } from '../settings/CollectionAccountCard';
import { formatDate, formatMoney, formatMoneyShort } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';
import { todayIso } from './loanDraft';

type Action = { kind: 'collect' | 'revert'; installment: InstallmentResponse } | null;

/**
 * Cuotas reales de un prestamo desembolsado. El vendedor cobra (o adelanta) siempre la primera
 * pendiente; el admin puede volver a pendiente la ultima cobrada si se cargo por error.
 */
export function InstallmentsSection({ loan }: { loan: LoanResponse }) {
  const user = useAuthStore((s) => s.user);
  const canCollect =
    hasPermission(user, Permission.COLLECTION_REGISTER) && loan.status === 'DISBURSED';
  const canRevert = hasPermission(user, Permission.COLLECTION_REVERT);
  const queryClient = useQueryClient();
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState('');
  const [opened, modal] = useDisclosure(false);

  const rows = loan.schedule ?? [];
  const collected = rows.filter((r) => r.status === 'COLLECTED').length;
  const next = rows.find((r) => r.status === 'PENDING');
  const last = [...rows].reverse().find((r) => r.status === 'COLLECTED');
  const today = todayIso();

  const open = (kind: 'collect' | 'revert', installment: InstallmentResponse) => {
    setAction({ kind, installment });
    setReason('');
    modal.open();
  };

  const mutation = useMutation({
    mutationFn: () => {
      if (!action) throw new Error('Sin accion');
      return action.kind === 'collect'
        ? api.collectInstallment(loan.id, action.installment.number)
        : api.revertInstallment(loan.id, action.installment.number, reason.trim());
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.loan(loan.id), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.loans });
      modal.close();
      notifySuccess(
        action?.kind === 'collect'
          ? updated.status === 'COMPLETED'
            ? `Cuota ${action.installment.number} cobrada. ¡Préstamo finalizado!`
            : `Cuota ${action.installment.number} cobrada`
          : `Cuota ${action?.installment.number} vuelve a pendiente`,
      );
    },
    onError: (error) => {
      modal.close();
      notifyError(error);
      void queryClient.invalidateQueries({ queryKey: queryKeys.loan(loan.id) });
    },
  });

  const isAdvance = (i: InstallmentResponse) => i.dueDate > today;

  return (
    <>
      <Card withBorder padding="md">
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={700}>Cuotas</Text>
            <Text size="sm" c="dimmed">
              {collected} de {rows.length} cobradas
            </Text>
          </Group>
          <Progress
            value={rows.length ? (collected / rows.length) * 100 : 0}
            color={loan.status === 'COMPLETED' ? 'gray' : 'teal'}
            aria-label="Avance de cobro"
          />

          {canCollect && next && (
            <Button
              size="md"
              color={isAdvance(next) ? 'blue' : 'teal'}
              leftSection={
                isAdvance(next) ? <IconPlayerTrackNext size={20} /> : <IconCash size={20} />
              }
              onClick={() => open('collect', next)}
            >
              {isAdvance(next)
                ? `Adelantar cuota ${next.number} · ${formatMoneyShort(next.amount)}`
                : `Cobrar cuota ${next.number} · ${formatMoneyShort(next.amount)}`}
            </Button>
          )}

          <Stack gap={0}>
            {rows.map((row) => (
              <InstallmentRow
                key={row.number}
                row={row}
                total={rows.length}
                onRevert={
                  canRevert && last?.number === row.number ? () => open('revert', row) : undefined
                }
              />
            ))}
          </Stack>
        </Stack>
      </Card>

      {/* Despues de cobrar, el vendedor transfiere al admin: se le muestra a donde. */}
      {isSeller(user) && <CollectionAccountCard compact />}

      {loan.history && loan.history.length > 0 && (
        <Card withBorder padding="md">
          <Text fw={700} mb="sm">
            Historial de cobros
          </Text>
          <Timeline bulletSize={22} lineWidth={2} active={loan.history.length}>
            {[...loan.history].reverse().map((e, index) => (
              <Timeline.Item
                key={`${e.occurredAt}-${index}`}
                color={e.type === 'COLLECTED' ? 'teal' : 'red'}
                bullet={
                  e.type === 'COLLECTED' ? <IconCheck size={12} /> : <IconArrowBackUp size={12} />
                }
                title={
                  e.type === 'COLLECTED'
                    ? `Cuota ${e.number} cobrada${e.advance ? ' (adelanto)' : ''}`
                    : `Cuota ${e.number} vuelta a pendiente`
                }
              >
                <Text size="xs" c="dimmed">
                  {formatDate(e.occurredAt)} · {e.actorName}
                </Text>
                {e.reason && <Text size="sm">Motivo: {e.reason}</Text>}
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      )}

      <Modal
        opened={opened}
        onClose={modal.close}
        centered
        title={
          action?.kind === 'collect'
            ? isAdvance(action.installment)
              ? 'Adelantar cuota'
              : 'Registrar cobro'
            : 'Marcar como no cobrada'
        }
      >
        {action && (
          <Stack>
            {action.kind === 'collect' ? (
              <>
                <Text size="sm">
                  ¿Cobraste <b>{formatMoney(action.installment.amount)}</b> a{' '}
                  <b>{loan.customerName}</b>? Cuota {action.installment.number} de {rows.length}.
                </Text>
                {isAdvance(action.installment) && (
                  <Text size="sm" c="blue">
                    Vence el {formatDate(action.installment.dueDate)}: queda registrada como
                    adelanto.
                  </Text>
                )}
                <Text size="xs" c="dimmed">
                  Si te equivocás, el administrador puede corregirlo.
                </Text>
              </>
            ) : (
              <Textarea
                label="Motivo"
                description="Queda en el historial del préstamo"
                placeholder="Ej.: se cargó por error, el cliente no pagó"
                autosize
                minRows={2}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.currentTarget.value)}
                data-autofocus
              />
            )}
            <Group grow>
              <Button variant="default" onClick={modal.close} disabled={mutation.isPending}>
                Volver
              </Button>
              <Button
                color={action.kind === 'collect' ? 'teal' : 'red'}
                onClick={() => mutation.mutate()}
                loading={mutation.isPending}
                disabled={action.kind === 'revert' && !reason.trim()}
              >
                {action.kind === 'collect' ? 'Cobrada' : 'Corregir'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}

function InstallmentRow({
  row,
  total,
  onRevert,
}: {
  row: InstallmentResponse;
  total: number;
  onRevert?: () => void;
}) {
  const collected = row.status === 'COLLECTED';
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      py="xs"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      <Stack gap={2} style={{ minWidth: 0 }}>
        <Group gap={6}>
          <Text size="sm" fw={600}>
            Cuota {row.number}/{total}
          </Text>
          {collected ? (
            <Badge size="xs" color="teal" variant="light">
              Cobrada
            </Badge>
          ) : row.overdue ? (
            <Badge size="xs" color="red" variant="light">
              Vencida
            </Badge>
          ) : (
            <Badge size="xs" color="gray" variant="light">
              Pendiente
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {collected && row.collectedAt
            ? `Cobrada el ${formatDate(row.collectedAt)}${row.collectedByName ? ` · ${row.collectedByName}` : ''}`
            : `Vence el ${formatDate(row.dueDate)}`}
        </Text>
        {onRevert && (
          <Button
            size="compact-xs"
            variant="subtle"
            color="red"
            w="fit-content"
            px={0}
            leftSection={<IconArrowBackUp size={14} />}
            onClick={onRevert}
          >
            Marcar no cobrada
          </Button>
        )}
      </Stack>
      <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>
        {formatMoneyShort(row.amount)}
      </Text>
    </Group>
  );
}
