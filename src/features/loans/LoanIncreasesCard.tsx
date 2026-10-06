import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Skeleton,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCheck, IconSend, IconTrendingUp, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { LoanIncrease, LoanResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, Permission } from '../../auth/permissions';
import { Foldable } from '../../shared/components/Foldable';
import { formatDate, formatMoney, formatMoneyShort } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';
import { CopyRow } from './DisbursementCard';

const STATUS: Record<LoanIncrease['status'], { label: string; color: string }> = {
  REQUESTED: { label: 'Pendiente', color: 'yellow' },
  APPROVED: { label: 'Falta transferir', color: 'blue' },
  DISBURSED: { label: 'Transferido', color: 'teal' },
  REJECTED: { label: 'Rechazado', color: 'red' },
};

/**
 * Aumentos del prestamo. El que esta en curso se ve arriba: pendiente (el admin lo aprueba o
 * rechaza) o aprobado sin transferir (quien transfiere lo registra y recien ahi se agregan las
 * cuotas). Los terminados quedan en un historial plegado. Sin aumentos, no se muestra nada.
 */
export function LoanIncreasesCard({
  loan,
  increases,
}: {
  loan: LoanResponse;
  increases: LoanIncrease[];
}) {
  const pending = increases.find((i) => i.status === 'REQUESTED');
  const approved = increases.find((i) => i.status === 'APPROVED');
  const decided = increases.filter((i) => i.status === 'DISBURSED' || i.status === 'REJECTED');
  if (increases.length === 0) return null;
  return (
    <>
      {pending && <PendingIncrease loan={loan} increase={pending} />}
      {approved && <ApprovedIncrease loan={loan} increase={approved} />}
      {decided.length > 0 && (
        <Foldable
          title="Aumentos"
          aside={
            <Badge variant="light" color="gray">
              {decided.length}
            </Badge>
          }
        >
          <Stack gap="xs">
            {decided.map((i) => (
              <Stack key={i.id} gap={2}>
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={600}>
                    +{i.extraInstallments} cuota{i.extraInstallments === 1 ? '' : 's'} ·{' '}
                    {formatMoneyShort(i.extraPrincipal)}
                  </Text>
                  <Badge size="xs" variant="light" color={STATUS[i.status].color}>
                    {STATUS[i.status].label}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Pedido por {i.requestedByName} el {formatDate(i.requestedAt)}
                  {i.decidedAt && ` · decidido el ${formatDate(i.decidedAt)}`}
                  {i.decidedByName && ` por ${i.decidedByName}`}
                  {i.disbursedAt && ` · transferido el ${formatDate(i.disbursedAt)}`}
                  {i.disbursementReference && ` (${i.disbursementReference})`}
                </Text>
                {i.reason && <Text size="xs">Motivo: {i.reason}</Text>}
              </Stack>
            ))}
          </Stack>
        </Foldable>
      )}
    </>
  );
}

function PendingIncrease({ loan, increase }: { loan: LoanResponse; increase: LoanIncrease }) {
  const user = useAuthStore((s) => s.user);
  const canDecide = hasPermission(user, Permission.LOAN_APPROVE);
  const queryClient = useQueryClient();
  const [rejecting, rejectModal] = useDisclosure(false);
  const [approving, approveModal] = useDisclosure(false);
  const [reason, setReason] = useState('');

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.loanIncreases(loan.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.loan(loan.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.loans });
  };
  const decide = useMutation({
    mutationFn: (approve: boolean) =>
      approve
        ? api.approveIncrease(loan.id, increase.id)
        : api.rejectIncrease(loan.id, increase.id, reason.trim()),
    onSuccess: (_, approve) => {
      rejectModal.close();
      approveModal.close();
      refresh();
      notifySuccess(
        approve ? 'Aumento aprobado: falta registrar la transferencia' : 'Aumento rechazado',
      );
    },
    onError: (error) => {
      rejectModal.close();
      approveModal.close();
      notifyError(error);
      refresh();
    },
  });

  const total = loan.installments + increase.extraInstallments;
  return (
    <Card withBorder padding="md" style={{ borderColor: 'var(--mantine-color-yellow-5)' }}>
      <Stack gap="sm">
        <Group gap="xs" wrap="nowrap">
          <IconTrendingUp size={20} />
          <Text fw={700}>Aumento pendiente de aprobación</Text>
        </Group>
        <Text size="sm">
          +{increase.extraInstallments} cuota{increase.extraInstallments === 1 ? '' : 's'} de{' '}
          {formatMoneyShort(increase.installmentAmount)}: el cliente recibe{' '}
          <b>{formatMoney(increase.extraPrincipal)}</b> más y queda en {total} cuotas.
        </Text>
        <Text size="xs" c="dimmed">
          Pedido por {increase.requestedByName} el {formatDate(increase.requestedAt)}
        </Text>
        {canDecide && (
          <Group grow>
            <Button
              variant="light"
              color="red"
              leftSection={<IconX size={18} />}
              onClick={() => {
                setReason('');
                rejectModal.open();
              }}
            >
              Rechazar
            </Button>
            <Button color="teal" leftSection={<IconCheck size={18} />} onClick={approveModal.open}>
              Aprobar
            </Button>
          </Group>
        )}
      </Stack>

      <Modal opened={approving} onClose={approveModal.close} title="Aprobar aumento" centered>
        <Stack>
          <Text size="sm">
            Se aprueba el aumento de <b>{formatMoney(increase.extraPrincipal)}</b> para{' '}
            <b>{loan.customerName}</b>. Las {increase.extraInstallments} cuotas se agregan cuando se
            registre la transferencia.
          </Text>
          <Group grow>
            <Button variant="default" onClick={approveModal.close} disabled={decide.isPending}>
              Volver
            </Button>
            <Button color="teal" onClick={() => decide.mutate(true)} loading={decide.isPending}>
              Aprobar
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal opened={rejecting} onClose={rejectModal.close} title="Rechazar aumento" centered>
        <Stack>
          <Textarea
            label="Motivo"
            description="Lo ve el vendedor"
            autosize
            minRows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            data-autofocus
          />
          <Group grow>
            <Button variant="default" onClick={rejectModal.close} disabled={decide.isPending}>
              Volver
            </Button>
            <Button
              color="red"
              onClick={() => decide.mutate(false)}
              loading={decide.isPending}
              disabled={!reason.trim()}
            >
              Rechazar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}

/** Aumento aprobado: falta transferir. Quien registra transferencias lo hace aca, como un prestamo. */
function ApprovedIncrease({ loan, increase }: { loan: LoanResponse; increase: LoanIncrease }) {
  const user = useAuthStore((s) => s.user);
  const canDisburse = hasPermission(user, Permission.DISBURSEMENT_REGISTER);
  const queryClient = useQueryClient();
  const [confirming, modal] = useDisclosure(false);
  const [reference, setReference] = useState('');
  const customer = useQuery({
    queryKey: queryKeys.customer(loan.customerId),
    queryFn: () => api.customer(loan.customerId),
    enabled: canDisburse,
  });
  const account = customer.data?.bankAccount;

  const disburse = useMutation({
    mutationFn: () => api.disburseIncrease(loan.id, increase.id, reference.trim() || null),
    onSuccess: () => {
      modal.close();
      void queryClient.invalidateQueries({ queryKey: queryKeys.loanIncreases(loan.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.loan(loan.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.loans });
      notifySuccess(`Transferencia registrada: se agregaron ${increase.extraInstallments} cuotas`);
    },
    onError: (error) => {
      modal.close();
      notifyError(error);
      void queryClient.invalidateQueries({ queryKey: queryKeys.loanIncreases(loan.id) });
    },
  });

  return (
    <Card withBorder padding="md" style={{ borderColor: 'var(--mantine-color-blue-5)' }}>
      <Stack gap="sm">
        <Group gap="xs" wrap="nowrap">
          <IconTrendingUp size={20} />
          <Text fw={700}>
            Aumento aprobado: falta transferir {formatMoneyShort(increase.extraPrincipal)}
          </Text>
        </Group>
        <Text size="sm">
          +{increase.extraInstallments} cuota{increase.extraInstallments === 1 ? '' : 's'} de{' '}
          {formatMoneyShort(increase.installmentAmount)}. Se agregan al plan cuando se registra la
          transferencia.
        </Text>
        {!canDisburse && (
          <Text size="xs" c="dimmed">
            Esperando que el administrador registre la transferencia.
          </Text>
        )}
        {canDisburse && (
          <>
            {customer.isLoading && <Skeleton h={60} />}
            {account && (
              <Stack gap={4}>
                <CopyRow label={account.virtual ? 'CVU' : 'CBU'} value={account.cbu} />
                {account.alias && <CopyRow label="Alias" value={account.alias} />}
              </Stack>
            )}
            <TextInput
              label="Comprobante (opcional)"
              placeholder="Ej.: nro. de operación"
              maxLength={100}
              value={reference}
              onChange={(e) => setReference(e.currentTarget.value)}
            />
            <Button leftSection={<IconSend size={18} />} onClick={modal.open}>
              Registrar transferencia del aumento
            </Button>
          </>
        )}
      </Stack>

      <Modal opened={confirming} onClose={modal.close} title="Transferencia del aumento" centered>
        <Stack>
          <Text size="sm">
            Confirmás que transferiste <b>{formatMoney(increase.extraPrincipal)}</b> a{' '}
            <b>{loan.customerName}</b>?
          </Text>
          <Text size="sm" c="dimmed">
            Se agregan {increase.extraInstallments} cuotas al final del préstamo, con la misma
            frecuencia.
          </Text>
          <Group grow>
            <Button variant="default" onClick={modal.close} disabled={disburse.isPending}>
              Volver
            </Button>
            <Button onClick={() => disburse.mutate()} loading={disburse.isPending}>
              Confirmar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
