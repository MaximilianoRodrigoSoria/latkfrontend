import { Button, Card, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { LoanResponse } from '../../api/types';
import { formatMoneyShort } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';

const MAX_REASON = 500;

/** Aprobar o rechazar una solicitud pendiente (permiso loan.approve). */
export function LoanDecisionActions({ loan }: { loan: LoanResponse }) {
  const queryClient = useQueryClient();
  const [approving, approveModal] = useDisclosure(false);
  const [rejecting, rejectModal] = useDisclosure(false);
  const [reason, setReason] = useState('');

  const onDecided = (decided: LoanResponse, message: string) => {
    // La respuesta no trae el plan estimado: se conserva el que ya estaba en cache.
    queryClient.setQueryData<LoanResponse>(queryKeys.loan(loan.id), (prev) => ({
      ...decided,
      estimatedSchedule: prev?.estimatedSchedule,
    }));
    void queryClient.invalidateQueries({ queryKey: queryKeys.loans });
    approveModal.close();
    rejectModal.close();
    notifySuccess(message);
  };

  const onFailed = (error: unknown) => {
    approveModal.close();
    rejectModal.close();
    notifyError(error);
    // Si otro usuario lo decidio antes (409) se recarga el estado real.
    void queryClient.invalidateQueries({ queryKey: queryKeys.loan(loan.id) });
  };

  const approve = useMutation({
    mutationFn: () => api.approveLoan(loan.id),
    onSuccess: (d) => onDecided(d, `Préstamo de ${d.customerName} aprobado`),
    onError: onFailed,
  });
  const reject = useMutation({
    mutationFn: () => api.rejectLoan(loan.id, reason.trim()),
    onSuccess: (d) => onDecided(d, `Solicitud de ${d.customerName} rechazada`),
    onError: onFailed,
  });
  const busy = approve.isPending || reject.isPending;

  return (
    <Card withBorder padding="md" style={{ borderColor: 'var(--mantine-color-yellow-5)' }}>
      <Stack gap="sm">
        <Stack gap={2}>
          <Text fw={700}>Pendiente de tu aprobación</Text>
          <Text size="sm" c="dimmed">
            {loan.sellerName} pide {formatMoneyShort(loan.principal)} para {loan.customerName}.
          </Text>
        </Stack>
        <Group grow>
          <Button
            color="red"
            variant="light"
            leftSection={<IconX size={18} />}
            onClick={rejectModal.open}
            disabled={busy}
          >
            Rechazar
          </Button>
          <Button
            color="teal"
            leftSection={<IconCheck size={18} />}
            onClick={approveModal.open}
            disabled={busy}
          >
            Aprobar
          </Button>
        </Group>
      </Stack>

      <Modal opened={approving} onClose={approveModal.close} title="Aprobar préstamo" centered>
        <Stack>
          <Text size="sm">
            Aprobás <b>{formatMoneyShort(loan.principal)}</b> para <b>{loan.customerName}</b> en{' '}
            {loan.installments} cuotas de {formatMoneyShort(loan.installmentAmount)}.
          </Text>
          <Text size="sm" c="dimmed">
            El siguiente paso es transferir el dinero a la cuenta del cliente.
          </Text>
          <Group grow>
            <Button variant="default" onClick={approveModal.close} disabled={busy}>
              Volver
            </Button>
            <Button color="teal" onClick={() => approve.mutate()} loading={approve.isPending}>
              Confirmar aprobación
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={rejecting} onClose={rejectModal.close} title="Rechazar solicitud" centered>
        <Stack>
          <Textarea
            label="Motivo"
            description="Lo ve el vendedor para explicarle al cliente"
            placeholder="Ej.: ingresos insuficientes para la cuota"
            autosize
            minRows={3}
            maxLength={MAX_REASON}
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            data-autofocus
          />
          <Group grow>
            <Button variant="default" onClick={rejectModal.close} disabled={busy}>
              Volver
            </Button>
            <Button
              color="red"
              onClick={() => reject.mutate()}
              loading={reject.isPending}
              disabled={!reason.trim()}
            >
              Confirmar rechazo
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
