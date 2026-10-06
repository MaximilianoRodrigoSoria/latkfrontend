import {
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Progress,
  Stack,
  Text,
  Textarea,
  Timeline,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowBackUp,
  IconCash,
  IconCheck,
  IconFileDownload,
  IconPlayerTrackNext,
  IconReceipt,
} from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { InstallmentEventResponse, InstallmentResponse, LoanResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, isSeller, Permission } from '../../auth/permissions';
import { CollectionAccountCard } from '../settings/CollectionAccountCard';
import { WhatsAppButton } from '../../shared/components/WhatsAppButton';
import { formatDate, formatMoney, formatMoneyShort } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';
import { todayIso } from './loanDraft';
import { ReceiptModal } from './ReceiptModal';
import type { PartialPayment } from './receipt';
import { paymentDelay } from './collectionState';
import { Foldable } from '../../shared/components/Foldable';
import { notify } from '../../shared/notify';
import {
  isOfflineError,
  useOfflineCollections,
  type PendingCollection,
} from './offlineCollections';

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
  // Recibo de la cuota (se abre solo despues de cobrar, o desde la fila de una cuota cobrada). Con
  // `partial`, el recibo de un abono parcial.
  const [receiptFor, setReceiptFor] = useState<{
    number: number;
    partial?: PartialPayment;
    pending?: PendingCollection;
  } | null>(null);
  // Monto a cobrar: por defecto lo que falta de la cuota; menos es un abono parcial.
  const [amount, setAmount] = useState<number | ''>('');

  const rows = loan.schedule ?? [];
  const collected = rows.filter((r) => r.status === 'COLLECTED').length;
  const next = rows.find((r) => r.status === 'PENDING');
  const last = [...rows].reverse().find((r) => r.status === 'COLLECTED');
  const today = todayIso();

  const open = (kind: 'collect' | 'revert', installment: InstallmentResponse) => {
    setAction({ kind, installment });
    setReason('');
    setAmount(remainingOf(installment));
    modal.open();
  };
  const owed = action ? remainingOf(action.installment) : 0;
  const isPartial = action?.kind === 'collect' && amount !== '' && amount > 0 && amount < owed;

  const mutation = useMutation({
    // Sin señal tiene que fallar enseguida (y guardarse en el celular), no quedar en pausa.
    networkMode: 'always',
    mutationFn: () => {
      if (!action) throw new Error('Sin accion');
      return action.kind === 'collect'
        ? api.collectInstallment(
            loan.id,
            action.installment.number,
            isPartial ? Number(amount) : undefined,
          )
        : api.revertInstallment(loan.id, action.installment.number, reason.trim());
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.loan(loan.id), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.loans });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.customerActivity(loan.customerId),
      });
      modal.close();
      if (action?.kind === 'collect') {
        const n = action.installment.number;
        setReceiptFor({ number: n, partial: isPartial ? lastPartial(updated, n) : undefined });
      }
      notifySuccess(
        action?.kind === 'collect'
          ? isPartial
            ? `Abono de ${formatMoneyShort(Number(amount))} a la cuota ${action.installment.number}`
            : updated.status === 'COMPLETED'
              ? `Cuota ${action.installment.number} cobrada. ¡Préstamo finalizado!`
              : `Cuota ${action.installment.number} cobrada`
          : `Cuota ${action?.installment.number} vuelve a pendiente`,
      );
    },
    onError: (error) => {
      modal.close();
      // Sin señal: el cobro queda guardado en el celular y se manda solo al volver la conexion.
      if (action?.kind === 'collect' && isOfflineError(error)) {
        const entry = useOfflineCollections.getState().add({
          loanId: loan.id,
          customerName: loan.customerName,
          number: action.installment.number,
          amount: isPartial ? Number(amount) : undefined,
        });
        notify({
          tone: 'warning',
          title: 'Sin conexión',
          message: `Cobro de la cuota ${action.installment.number} guardado: se envía cuando vuelva la señal.`,
        });
        setReceiptFor({ number: entry.number, pending: entry });
        return;
      }
      notifyError(error);
      void queryClient.invalidateQueries({ queryKey: queryKeys.loan(loan.id) });
    },
  });
  const offlinePending = useOfflineCollections((s) => s.pending);
  const queuedEntries = offlinePending.filter((p) => p.loanId === loan.id);
  const queued = queuedEntries.map((p) => p.number);
  // Mora de la cuota que se esta cobrando (solo si se completa: un abono no la cobra).
  const lateFeeNow =
    action?.kind === 'collect' && !isPartial ? (action.installment.lateFee ?? 0) : 0;

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

          {queuedEntries.length > 0 && (
            <Stack gap={2}>
              <Text size="sm" c="orange">
                Cobro sin enviar (cuota {queued.join(', ')}): se registra cuando vuelva la señal.
              </Text>
              {queuedEntries.map((entry) => (
                <Button
                  key={entry.reference}
                  size="compact-xs"
                  variant="subtle"
                  color="orange"
                  w="fit-content"
                  px={0}
                  leftSection={<IconReceipt size={14} />}
                  onClick={() => setReceiptFor({ number: entry.number, pending: entry })}
                >
                  Recibo provisorio de la cuota {entry.number}
                </Button>
              ))}
            </Stack>
          )}

          {canCollect && next && !queued.includes(next.number) && (
            <Button
              size="md"
              color={isAdvance(next) ? 'blue' : 'teal'}
              leftSection={
                isAdvance(next) ? <IconPlayerTrackNext size={20} /> : <IconCash size={20} />
              }
              onClick={() => open('collect', next)}
            >
              {isAdvance(next)
                ? `Adelantar cuota ${next.number} · ${formatMoneyShort(remainingOf(next))}`
                : `Cobrar cuota ${next.number} · ${formatMoneyShort(remainingOf(next))}`}
            </Button>
          )}

          {canCollect && (
            <Anchor
              href="/talonario-cobro.pdf"
              target="_blank"
              rel="noopener"
              size="xs"
              w="fit-content"
            >
              <Group gap={4}>
                <IconFileDownload size={14} /> Talonario en papel para cobros en efectivo (PDF)
              </Group>
            </Anchor>
          )}

          {/* Recordatorio al cliente por WhatsApp: abre el chat con el mensaje ya escrito. */}
          {next?.reminderUrl && (
            <WhatsAppButton href={next.reminderUrl} variant="light" size="md">
              {next.overdue
                ? `Reclamar cuota ${next.number} por WhatsApp`
                : `Recordar cuota ${next.number} por WhatsApp`}
            </WhatsAppButton>
          )}
          {next && !next.reminderUrl && loan.status === 'DISBURSED' && (
            <Text size="xs" c="dimmed">
              Para mandar recordatorios por WhatsApp, cargá un celular con código de área en los
              datos del cliente.
            </Text>
          )}

          <Stack gap={0}>
            {rows.map((row) => (
              <InstallmentRow
                key={row.number}
                row={row}
                total={rows.length}
                onRevert={
                  canRevert &&
                  (last?.number === row.number ||
                    (row.status === 'PENDING' && (row.paidAmount ?? 0) > 0))
                    ? () => open('revert', row)
                    : undefined
                }
                onReceipt={() => setReceiptFor({ number: row.number })}
              />
            ))}
          </Stack>
        </Stack>
      </Card>

      {/* Despues de cobrar, el vendedor transfiere al admin: se le muestra a donde. */}
      {isSeller(user) && <CollectionAccountCard compact />}

      {loan.history && loan.history.length > 0 && (
        <Foldable
          title="Historial de cobros"
          aside={
            <Badge variant="light" color="gray">
              {loan.history.length}
            </Badge>
          }
        >
          <Timeline bulletSize={22} lineWidth={2} active={loan.history.length}>
            {[...loan.history].reverse().map((e, index) => (
              <Timeline.Item
                key={`${e.occurredAt}-${index}`}
                color={e.type === 'COLLECTED' ? 'teal' : e.type === 'PARTIAL' ? 'cyan' : 'red'}
                bullet={
                  e.type === 'REVERTED' ? <IconArrowBackUp size={12} /> : <IconCheck size={12} />
                }
                title={
                  e.type === 'COLLECTED'
                    ? `Cuota ${e.number} cobrada${e.advance ? ' (adelanto)' : ''}`
                    : e.type === 'PARTIAL'
                      ? `Abono de ${formatMoneyShort(e.amount ?? 0)} a la cuota ${e.number}`
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
        </Foldable>
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
            : action?.installment.status === 'PENDING'
              ? 'Anular abonos'
              : 'Marcar como no cobrada'
        }
      >
        {action && (
          <Stack>
            {action.kind === 'collect' ? (
              <>
                <Text size="sm">
                  Cuota {action.installment.number} de {rows.length} de <b>{loan.customerName}</b>
                  {(action.installment.paidAmount ?? 0) > 0
                    ? `: ya abonó ${formatMoney(action.installment.paidAmount ?? 0)}, faltan ${formatMoney(owed)}.`
                    : `: ${formatMoney(owed)}.`}
                </Text>
                <NumberInput
                  label="Monto cobrado"
                  description="Si el cliente pagó una parte, poné cuánto: la cuota queda pendiente hasta completarla."
                  prefix="$ "
                  thousandSeparator="."
                  decimalSeparator=","
                  min={1}
                  max={owed}
                  allowNegative={false}
                  value={amount}
                  onChange={(v) => setAmount(typeof v === 'number' ? v : '')}
                  data-autofocus
                />
                {lateFeeNow > 0 && (
                  <Text size="sm" c="orange">
                    Además, recargo por mora: {formatMoney(lateFeeNow)}. Total a cobrar:{' '}
                    <b>{formatMoney(Number(amount) + lateFeeNow)}</b>.
                  </Text>
                )}
                {isPartial && (
                  <Text size="sm" c="cyan">
                    Abono parcial: van a faltar {formatMoney(owed - Number(amount))} de esta cuota.
                  </Text>
                )}
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
                disabled={
                  action.kind === 'revert'
                    ? !reason.trim()
                    : amount === '' || amount <= 0 || amount > owed
                }
              >
                {action.kind === 'collect'
                  ? isPartial
                    ? 'Registrar abono'
                    : 'Cobrada'
                  : 'Corregir'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
      <ReceiptModal
        loan={loan}
        row={(loan.schedule ?? []).find((r) => r.number === receiptFor?.number) ?? null}
        partial={receiptFor?.partial}
        pending={receiptFor?.pending}
        onClose={() => setReceiptFor(null)}
      />
    </>
  );
}

function InstallmentRow({
  row,
  total,
  onRevert,
  onReceipt,
}: {
  row: InstallmentResponse;
  total: number;
  onRevert?: () => void;
  onReceipt?: () => void;
}) {
  const collected = row.status === 'COLLECTED';
  const delay = paymentDelay(row);
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
            // Puntualidad: si se cobro despues del vencimiento, cuantos dias tarde.
            delay != null && delay > 0 ? (
              <Badge size="xs" color="orange" variant="light">
                Cobrada {delay} día{delay === 1 ? '' : 's'} tarde
              </Badge>
            ) : (
              <Badge size="xs" color="teal" variant="light">
                Cobrada a tiempo
              </Badge>
            )
          ) : (row.paidAmount ?? 0) > 0 ? (
            <Badge size="xs" color={row.overdue ? 'red' : 'cyan'} variant="light">
              Parcial · faltan {formatMoneyShort(row.amount - (row.paidAmount ?? 0))}
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
        {(row.lateFee ?? 0) > 0 && (
          <Text size="xs" c="orange">
            {collected ? 'Con' : '+'} mora {formatMoneyShort(row.lateFee ?? 0)}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          {collected && row.collectedAt
            ? `Cobrada el ${formatDate(row.collectedAt)}${row.collectedByName ? ` · ${row.collectedByName}` : ''}`
            : `Vence el ${formatDate(row.dueDate)}`}
        </Text>
        {collected && onReceipt && (
          <Button
            size="compact-xs"
            variant="subtle"
            w="fit-content"
            px={0}
            leftSection={<IconReceipt size={14} />}
            onClick={onReceipt}
          >
            Ver recibo
          </Button>
        )}
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
            {row.status === 'PENDING' ? 'Anular abonos' : 'Marcar no cobrada'}
          </Button>
        )}
      </Stack>
      <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>
        {formatMoneyShort(row.amount)}
      </Text>
    </Group>
  );
}

/** Lo que falta para completar la cuota (descontando abonos parciales). */
function remainingOf(row: InstallmentResponse): number {
  return row.status === 'COLLECTED' ? 0 : row.amount - (row.paidAmount ?? 0);
}

/** El ultimo abono parcial de la cuota, para su recibo. */
function lastPartial(loan: LoanResponse, number: number): PartialPayment | undefined {
  const partials = (loan.history ?? []).filter(
    (e: InstallmentEventResponse) => e.type === 'PARTIAL' && e.number === number,
  );
  const lastEvent = partials.at(-1);
  const row = (loan.schedule ?? []).find((r) => r.number === number);
  if (!lastEvent || !row) return undefined;
  return {
    amount: lastEvent.amount ?? 0,
    at: lastEvent.occurredAt,
    collector: lastEvent.actorName,
    remaining: remainingOf(row),
    index: partials.length,
  };
}
