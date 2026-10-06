import { Badge, Button, Card, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCheck, IconTrendingUp, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { LoanIncrease, LoanResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, Permission } from '../../auth/permissions';
import { Foldable } from '../../shared/components/Foldable';
import { formatDate, formatMoney, formatMoneyShort } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';

const STATUS: Record<LoanIncrease['status'], { label: string; color: string }> = {
  REQUESTED: { label: 'Pendiente', color: 'yellow' },
  APPROVED: { label: 'Aprobado', color: 'teal' },
  REJECTED: { label: 'Rechazado', color: 'red' },
};

/**
 * Aumentos del prestamo. El pendiente se ve arriba (el admin lo aprueba o rechaza ahi mismo); los
 * ya decididos quedan en un historial plegado. Sin aumentos, no se muestra nada.
 */
export function LoanIncreasesCard({
  loan,
  increases,
}: {
  loan: LoanResponse;
  increases: LoanIncrease[];
}) {
  const pending = increases.find((i) => i.status === 'REQUESTED');
  const decided = increases.filter((i) => i.status !== 'REQUESTED');
  if (increases.length === 0) return null;
  return (
    <>
      {pending && <PendingIncrease loan={loan} increase={pending} />}
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
      notifySuccess(approve ? 'Aumento aprobado: se agregaron las cuotas' : 'Aumento rechazado');
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
            Al aprobar, transferí <b>{formatMoney(increase.extraPrincipal)}</b> a{' '}
            <b>{loan.customerName}</b>. Se agregan {increase.extraInstallments} cuotas al final del
            préstamo.
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
