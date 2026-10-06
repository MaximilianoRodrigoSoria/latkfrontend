import {
  Alert,
  Anchor,
  Badge,
  Card,
  Group,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCash,
  IconCircleCheck,
  IconCircleX,
  IconClock,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import type { LoanResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, Permission } from '../../auth/permissions';
import {
  FREQUENCY_LABEL,
  formatDate,
  formatMoney,
  formatMoneyShort,
  formatRate,
} from '../../shared/format';
import { DisbursementCard } from './DisbursementCard';
import { InstallmentsSection } from './InstallmentsSection';
import { LoanDecisionActions } from './LoanDecisionActions';
import { INTEREST_METHOD_LABEL } from '../settings/LendingSettingsPage';
import { CustomerBehaviorCard } from '../customers/CustomerBehavior';
import { STATUS_COLOR, STATUS_LABEL } from './loanDraft';
import { LoanActionsMenu } from './LoanActionsMenu';
import { LoanIncreasesCard } from './LoanIncreasesCard';

export function LoanDetailPage() {
  const { id = '' } = useParams();
  const user = useAuthStore((s) => s.user);
  const canApprove = hasPermission(user, Permission.LOAN_APPROVE);
  const seesAll = hasPermission(user, Permission.LOAN_READ_ALL);
  const canDisburse = hasPermission(user, Permission.DISBURSEMENT_REGISTER);
  const loan = useQuery({ queryKey: queryKeys.loan(id), queryFn: () => api.loan(id) });
  const l = loan.data;
  // Aumentos: solo existen sobre prestamos ya transferidos.
  const increases = useQuery({
    queryKey: queryKeys.loanIncreases(id),
    queryFn: () => api.loanIncreases(id),
    enabled: l?.status === 'DISBURSED' || l?.status === 'COMPLETED',
  });
  const increaseList = increases.data ?? [];

  return (
    <Stack>
      <Anchor component={Link} to="/loans" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} /> Préstamos
        </Group>
      </Anchor>

      {loan.isLoading && <Skeleton h={300} />}
      {loan.isError && <Text c="red">{loan.error.message}</Text>}

      {l && (
        <>
          <Stack gap={4}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Title order={2} size="h3">
                {formatMoneyShort(l.principal)}
              </Title>
              <Group gap={4} wrap="nowrap">
                <Badge variant="light" size="lg" color={STATUS_COLOR[l.status]}>
                  {STATUS_LABEL[l.status]}
                </Badge>
                <LoanActionsMenu loan={l} increases={increaseList} />
              </Group>
            </Group>
            <Anchor component={Link} to={`/customers/${l.customerId}`} fw={600}>
              {l.customerName}
            </Anchor>
            <Text size="sm" c="dimmed">
              Solicitado el {formatDate(l.requestedAt)}
              {seesAll && ` por ${l.sellerName}`}
            </Text>
          </Stack>

          {/* Antes de decidir, el admin ve como paga el cliente (abierto: es el dato clave). */}
          {l.status === 'REQUESTED' && canApprove && (
            <CustomerBehaviorCard customerId={l.customerId} defaultOpen />
          )}

          {l.status === 'REQUESTED' && canApprove ? (
            <LoanDecisionActions loan={l} />
          ) : l.status === 'APPROVED' && canDisburse ? (
            <DisbursementCard loan={l} />
          ) : (
            <DecisionStatus loan={l} />
          )}

          <LoanIncreasesCard loan={l} increases={increaseList} />

          {l.schedule && l.schedule.length > 0 && <InstallmentsSection loan={l} />}

          <Card withBorder padding="md">
            <Stack gap={6}>
              <Row
                label="Producto"
                value={
                  l.productName === FREQUENCY_LABEL[l.frequency]
                    ? l.productName
                    : `${l.productName} · ${FREQUENCY_LABEL[l.frequency]}`
                }
              />
              <Row
                label="Cuotas"
                value={`${l.installments} de ${formatMoneyShort(l.installmentAmount)}`}
              />
              <Row label="Total a devolver" value={formatMoneyShort(l.totalToRepay)} strong />
              {(l.paperworkFee ?? 0) > 0 && (
                <Row
                  label="Papelería"
                  value={`${formatMoneyShort(l.paperworkFee ?? 0)} · el cliente recibe ${formatMoneyShort(l.principal - (l.paperworkFee ?? 0))}`}
                />
              )}
              {/* Solo quien ve tasas (admin): con que metodo se calculo este prestamo. */}
              {l.interestMethod && l.ratePerPeriod != null && (
                <Row
                  label="Cálculo"
                  value={`${INTEREST_METHOD_LABEL[l.interestMethod]} · ${formatRate(l.ratePerPeriod)}${l.interestMethod === 'FLAT' ? ' del plazo' : ' por cuota'}`}
                />
              )}
              {l.notes && <Row label="Notas del vendedor" value={l.notes} />}
            </Stack>
          </Card>

          {l.estimatedSchedule && l.estimatedSchedule.length > 0 && (
            <Card withBorder padding="sm">
              <Text fw={700} mb="xs" px={4}>
                Plan de cuotas estimado
              </Text>
              <Table.ScrollContainer minWidth={320}>
                <Table fz="sm" verticalSpacing={6} horizontalSpacing={6} striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>#</Table.Th>
                      <Table.Th>Vence aprox.</Table.Th>
                      <Table.Th ta="right">Cuota</Table.Th>
                      <Table.Th ta="right">Saldo</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {l.estimatedSchedule.map((row) => (
                      <Table.Tr key={row.number}>
                        <Table.Td>{row.number}</Table.Td>
                        <Table.Td>{formatDate(row.dueDate)}</Table.Td>
                        <Table.Td ta="right" fw={600}>
                          {formatMoney(row.amount)}
                        </Table.Td>
                        <Table.Td ta="right" c="dimmed">
                          {formatMoney(row.remainingBalance)}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Card>
          )}
        </>
      )}
    </Stack>
  );
}

/** Estado de la decision tal como lo ve quien no puede (o ya no necesita) decidir. */
export function DecisionStatus({ loan }: { loan: LoanResponse }) {
  switch (loan.status) {
    case 'REQUESTED':
      return (
        <Alert icon={<IconClock />} color="yellow" variant="light" title="Pendiente de aprobación">
          El administrador tiene que aprobarlo antes de transferir el dinero.
        </Alert>
      );
    case 'APPROVED':
      return (
        <Alert
          icon={<IconCircleCheck />}
          color="teal"
          variant="light"
          title={loan.autoApproved ? 'Aprobado automáticamente' : 'Aprobado'}
        >
          <Text size="sm">
            {loan.autoApproved
              ? loan.decisionReason
              : `Por ${loan.decidedByName ?? 'el administrador'}${loan.decidedAt ? ` el ${formatDate(loan.decidedAt)}` : ''}.`}
          </Text>
          <Text size="sm" fw={600} mt={6}>
            Esperando que el administrador registre la transferencia al cliente. Cuando lo haga, acá
            aparecen las cuotas y el botón para cobrarlas.
          </Text>
        </Alert>
      );
    case 'DISBURSED':
      return (
        <Alert icon={<IconCash />} color="green" variant="light" title="Transferido">
          {loan.disbursedOn && `El ${formatDate(loan.disbursedOn)}`}
          {loan.disbursedByName && ` por ${loan.disbursedByName}`}
          {loan.disbursementReference && ` · Comprobante ${loan.disbursementReference}`}.
        </Alert>
      );
    case 'COMPLETED':
      return (
        <Alert icon={<IconCircleCheck />} color="gray" variant="light" title="Préstamo finalizado">
          Todas las cuotas están cobradas.
        </Alert>
      );
    case 'REJECTED':
      return (
        <Alert icon={<IconCircleX />} color="red" variant="light" title="Rechazado">
          {loan.decisionReason && (
            <Text size="sm" fw={600}>
              Motivo: {loan.decisionReason}
            </Text>
          )}
          <Text size="sm">
            Por {loan.decidedByName ?? 'el administrador'}
            {loan.decidedAt && ` el ${formatDate(loan.decidedAt)}`}.
          </Text>
        </Alert>
      );
    default:
      return null;
  }
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Group justify="space-between" wrap="nowrap" align="flex-start">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size={strong ? 'md' : 'sm'} fw={strong ? 800 : 500} ta="right">
        {value}
      </Text>
    </Group>
  );
}
