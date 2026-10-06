import { ActionIcon, Button, Group, Menu, Modal, NumberInput, Stack, Text } from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { IconCircleCheck, IconDots, IconTrendingUp } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { LoanIncrease, LoanResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, Permission } from '../../auth/permissions';
import { formatMoney, formatMoneyShort, INSTALLMENTS_LABEL } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';

/** Cuantas cuotas se pueden agregar en un aumento (el backend valida lo mismo). */
const MAX_EXTRA = 60;

/**
 * Acciones poco frecuentes de un prestamo vigente, guardadas en un menu "⋯" para no recargar la
 * pantalla: saldar todo de una vez y pedir un aumento. Sin acciones disponibles, no se muestra.
 */
export function LoanActionsMenu({
  loan,
  increases,
}: {
  loan: LoanResponse;
  increases: LoanIncrease[];
}) {
  const user = useAuthStore((s) => s.user);
  const active = loan.status === 'DISBURSED';
  const canSettle = active && hasPermission(user, Permission.COLLECTION_REGISTER);
  const canIncrease = active && hasPermission(user, Permission.LOAN_REQUEST);
  const pendingIncrease = increases.some((i) => i.status === 'REQUESTED');
  const [settleOpen, settleModal] = useDisclosure(false);
  const [increaseOpen, increaseModal] = useDisclosure(false);

  if (!canSettle && !canIncrease) return null;

  return (
    <>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Más acciones">
            <IconDots size={20} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {canSettle && (
            <Menu.Item leftSection={<IconCircleCheck size={16} />} onClick={settleModal.open}>
              Saldar préstamo
            </Menu.Item>
          )}
          {canIncrease && (
            <Menu.Item
              leftSection={<IconTrendingUp size={16} />}
              onClick={increaseModal.open}
              disabled={pendingIncrease}
            >
              {pendingIncrease ? 'Aumento pendiente' : 'Pedir aumento'}
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
      {canSettle && <SettleModal loan={loan} opened={settleOpen} onClose={settleModal.close} />}
      {canIncrease && (
        <IncreaseModal loan={loan} opened={increaseOpen} onClose={increaseModal.close} />
      )}
    </>
  );
}

/** Lo que falta cobrar del prestamo: cuotas pendientes menos abonos, mas la mora acumulada. */
export function settleTotal(loan: LoanResponse): { pending: number; amount: number; late: number } {
  const rows = (loan.schedule ?? []).filter((r) => r.status === 'PENDING');
  const amount = rows.reduce((sum, r) => sum + r.amount - (r.paidAmount ?? 0), 0);
  const late = rows.reduce((sum, r) => sum + (r.lateFee ?? 0), 0);
  return {
    pending: rows.length,
    amount: Math.round(amount * 100) / 100,
    late: Math.round(late * 100) / 100,
  };
}

function SettleModal({
  loan,
  opened,
  onClose,
}: {
  loan: LoanResponse;
  opened: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const total = settleTotal(loan);
  const settle = useMutation({
    mutationFn: () => api.settleLoan(loan.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.loan(loan.id), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.loans });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.customerActivity(loan.customerId),
      });
      onClose();
      notifySuccess('Préstamo saldado: todas las cuotas quedaron cobradas');
    },
    onError: (error) => {
      onClose();
      notifyError(error);
      void queryClient.invalidateQueries({ queryKey: queryKeys.loan(loan.id) });
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Saldar préstamo" centered>
      <Stack>
        <Text size="sm">
          <b>{loan.customerName}</b> paga todo lo que debe: se registran como cobradas las{' '}
          {total.pending} cuota{total.pending === 1 ? '' : 's'} pendiente
          {total.pending === 1 ? '' : 's'}.
        </Text>
        <Text fw={800} size="lg">
          Total a cobrar: {formatMoney(total.amount + total.late)}
        </Text>
        {total.late > 0 && (
          <Text size="sm" c="orange">
            Incluye {formatMoney(total.late)} de recargo por mora.
          </Text>
        )}
        <Text size="xs" c="dimmed">
          Si te equivocás, el administrador puede corregirlo cuota por cuota.
        </Text>
        <Group grow>
          <Button variant="default" onClick={onClose} disabled={settle.isPending}>
            Volver
          </Button>
          <Button color="teal" onClick={() => settle.mutate()} loading={settle.isPending}>
            Saldar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function IncreaseModal({
  loan,
  opened,
  onClose,
}: {
  loan: LoanResponse;
  opened: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [extra, setExtra] = useState<number | ''>(1);
  const [debounced] = useDebouncedValue(extra, 300);
  const valid = typeof debounced === 'number' && debounced >= 1 && debounced <= MAX_EXTRA;
  const preview = useQuery({
    queryKey: ['increasePreview', loan.id, debounced],
    queryFn: () => api.previewIncrease(loan.id, Number(debounced)),
    enabled: opened && valid,
  });
  const request = useMutation({
    mutationFn: () => api.requestIncrease(loan.id, Number(extra)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.loanIncreases(loan.id) });
      onClose();
      notifySuccess('Aumento pedido: el administrador lo tiene que aprobar');
    },
    onError: (error) => {
      onClose();
      notifyError(error);
      void queryClient.invalidateQueries({ queryKey: queryKeys.loanIncreases(loan.id) });
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Pedir aumento" centered>
      <Stack>
        <Text size="sm">
          Se agregan cuotas al final del préstamo, del mismo valor (
          {formatMoneyShort(loan.installmentAmount)}) y {INSTALLMENTS_LABEL[loan.frequency]}. El
          cliente recibe el monto extra cuando el administrador lo aprueba.
        </Text>
        <NumberInput
          label="¿Cuántas cuotas querés agregar?"
          min={1}
          max={MAX_EXTRA}
          allowDecimal={false}
          allowNegative={false}
          value={extra}
          onChange={(v) => setExtra(typeof v === 'number' ? v : '')}
          data-autofocus
        />
        {valid && (
          <Text size="sm">
            {preview.isFetching || !preview.data ? (
              'Calculando…'
            ) : (
              <>
                El cliente recibe <b>{formatMoney(preview.data.extraPrincipal)}</b> más y paga{' '}
                {loan.installments + Number(debounced)} cuotas en total.
              </>
            )}
          </Text>
        )}
        {preview.isError && (
          <Text size="sm" c="red">
            {preview.error.message}
          </Text>
        )}
        <Group grow>
          <Button variant="default" onClick={onClose} disabled={request.isPending}>
            Volver
          </Button>
          <Button
            onClick={() => request.mutate()}
            loading={request.isPending}
            disabled={!valid || extra !== debounced || !preview.data}
          >
            Pedir aumento
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
