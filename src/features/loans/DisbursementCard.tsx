import {
  ActionIcon,
  Button,
  Card,
  CopyButton,
  Group,
  Modal,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCheck, IconCopy, IconSend } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { LoanResponse } from '../../api/types';
import { formatMoneyShort } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';

/**
 * Prestamo aprobado: muestra a donde transferir y registra la transferencia (permiso
 * disbursement.register). Al registrarla se generan las cuotas.
 */
export function DisbursementCard({ loan }: { loan: LoanResponse }) {
  const queryClient = useQueryClient();
  const [confirming, modal] = useDisclosure(false);
  const [reference, setReference] = useState('');
  const customer = useQuery({
    queryKey: queryKeys.customer(loan.customerId),
    queryFn: () => api.customer(loan.customerId),
  });
  const account = customer.data?.bankAccount;
  // Papeleria: se descuenta de lo que se transfiere.
  const fee = loan.paperworkFee ?? 0;
  const toTransfer = loan.principal - fee;

  const disburse = useMutation({
    mutationFn: () => api.disburseLoan(loan.id, reference.trim() || null),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.loan(loan.id), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.loans });
      modal.close();
      notifySuccess('Transferencia registrada: ya se pueden cobrar las cuotas');
    },
    onError: (error) => {
      modal.close();
      notifyError(error);
      void queryClient.invalidateQueries({ queryKey: queryKeys.loan(loan.id) });
    },
  });

  return (
    <Card withBorder padding="md" style={{ borderColor: 'var(--mantine-color-blue-5)' }}>
      <Stack gap="sm">
        <Stack gap={2}>
          <Text fw={700}>Falta transferir {formatMoneyShort(toTransfer)}</Text>
          {fee > 0 && (
            <Text size="sm">
              {formatMoneyShort(loan.principal)} − papelería {formatMoneyShort(fee)} ={' '}
              <b>{formatMoneyShort(toTransfer)}</b>
            </Text>
          )}
          <Text size="sm" c="dimmed">
            Transferí a la cuenta de {loan.customerName} y registralo acá.
          </Text>
        </Stack>

        {customer.isLoading && <Skeleton h={60} />}
        {account && (
          <Stack gap={4}>
            <CopyRow label={account.virtual ? 'CVU' : 'CBU'} value={account.cbu} />
            {account.alias && <CopyRow label="Alias" value={account.alias} />}
            {account.bankName && (
              <Text size="sm" c="dimmed">
                {account.bankName}
              </Text>
            )}
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
          Registrar transferencia
        </Button>
      </Stack>

      <Modal opened={confirming} onClose={modal.close} title="Registrar transferencia" centered>
        <Stack>
          <Text size="sm">
            Confirmás que transferiste <b>{formatMoneyShort(toTransfer)}</b> a{' '}
            <b>{loan.customerName}</b>?
          </Text>
          <Text size="sm" c="dimmed">
            Se generan las {loan.installments} cuotas; la primera vence en un período a partir de
            hoy.
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

export function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="sm" fw={600} ff="monospace" style={{ wordBreak: 'break-all' }}>
          {value}
        </Text>
      </Stack>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? 'Copiado' : 'Copiar'}>
            <ActionIcon variant="subtle" onClick={copy} aria-label={`Copiar ${label}`}>
              {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}
