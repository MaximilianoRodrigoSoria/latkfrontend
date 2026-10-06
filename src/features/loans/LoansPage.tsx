import {
  Badge,
  Button,
  Card,
  Chip,
  Group,
  TextInput,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconChevronRight, IconPlus, IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import type { LoanResponse, LoanStatus } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, Permission } from '../../auth/permissions';
import { ListThumb } from '../../shared/components/ListThumb';
import { PageHeader } from '../../shared/components/PageHeader';
import { FREQUENCY_LABEL, formatDate, formatMoneyShort } from '../../shared/format';
import { TIER_COLOR, TierIcon } from '../products/tiers';
import { LoansSectionTabs } from './LoansSectionTabs';
import { STATUS_COLOR, STATUS_LABEL, todayIso } from './loanDraft';

type StatusFilter = 'ALL' | 'OVERDUE' | LoanStatus;
const FILTER_LABEL: Record<LoanStatus, string> = {
  REQUESTED: 'Por aprobar',
  APPROVED: 'Por transferir',
  REJECTED: 'Rechazados',
  DISBURSED: 'En cobranza',
  COMPLETED: 'Finalizados',
};
const isOverdue = (loan: LoanResponse) =>
  loan.status === 'DISBURSED' && !!loan.nextDueDate && loan.nextDueDate < todayIso();

export function LoansPage() {
  const user = useAuthStore((s) => s.user);
  const canRequest = hasPermission(user, Permission.LOAN_REQUEST);
  const canApprove = hasPermission(user, Permission.LOAN_APPROVE);
  const seesAll = hasPermission(user, Permission.LOAN_READ_ALL);
  const mobile = useMediaQuery('(max-width: 48em)');
  const [params] = useSearchParams();
  const requested = params.get('status') as StatusFilter | null;
  // Quien aprueba entra directo a lo que espera su decision.
  const [status, setStatus] = useState<StatusFilter>(
    requested && (requested === 'ALL' || requested === 'OVERDUE' || requested in STATUS_LABEL)
      ? requested
      : canApprove
        ? 'REQUESTED'
        : 'ALL',
  );

  const loans = useQuery({ queryKey: queryKeys.loans, queryFn: api.loans });
  const [search, setSearch] = useState('');
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es-AR');
  const visible =
    loans.data?.filter(
      (l) =>
        (status === 'ALL' || (status === 'OVERDUE' ? isOverdue(l) : l.status === status)) &&
        normalize(
          `${l.customerName} ${l.customerDni ?? ''} ${seesAll ? l.sellerName : ''}`,
        ).includes(normalize(search.trim())),
    ) ?? [];
  const countOf = (s: LoanStatus) => loans.data?.filter((l) => l.status === s).length ?? 0;

  return (
    <Stack pb={canRequest && mobile ? 88 : 0}>
      <LoansSectionTabs />
      <PageHeader
        title="Préstamos"
        description={
          seesAll ? 'Solicitudes de todos los vendedores' : 'Solicitudes y préstamos de tu cartera'
        }
        action={
          canRequest && !mobile ? (
            <Button component={Link} to="/loans/new" leftSection={<IconPlus size={18} />}>
              Nuevo préstamo
            </Button>
          ) : undefined
        }
      />

      <TextInput
        label="Buscar préstamo"
        placeholder={seesAll ? 'Nombre, DNI o vendedor' : 'Nombre o DNI del cliente'}
        leftSection={<IconSearch size={18} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      <Chip.Group value={status} onChange={(v) => setStatus(v as StatusFilter)}>
        <Group gap="xs">
          <Chip value="ALL">Todos{loans.data && ` (${loans.data.length})`}</Chip>
          <Chip value="OVERDUE" color="red">
            Vencidos{loans.data && ` (${loans.data.filter(isOverdue).length})`}
          </Chip>
          {(Object.keys(STATUS_LABEL) as LoanStatus[]).map((s) => (
            <Chip key={s} value={s} color={STATUS_COLOR[s]}>
              {FILTER_LABEL[s]}
              {loans.data && ` (${countOf(s)})`}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
      {loans.data && (
        <Text size="sm" c="dimmed">
          {visible.length} préstamo{visible.length === 1 ? '' : 's'}
        </Text>
      )}

      {loans.isLoading && <Skeleton h={90} />}
      {loans.isError && <Text c="red">{loans.error.message}</Text>}
      {loans.data && visible.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          {search.trim()
            ? 'No hay préstamos que coincidan con la búsqueda.'
            : status === 'ALL'
              ? 'Todavía no hay préstamos.'
              : 'No hay préstamos en este estado.'}
        </Text>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {visible.map((loan) => (
          <LoanCard key={loan.id} loan={loan} showSeller={seesAll} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

export function LoanCard({ loan, showSeller }: { loan: LoanResponse; showSeller?: boolean }) {
  return (
    <Card withBorder padding="md" component={Link} to={`/loans/${loan.id}`}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap="sm" wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
          <ListThumb color={loan.productTier ? TIER_COLOR[loan.productTier] : undefined}>
            <TierIcon tier={loan.productTier} size={26} />
          </ListThumb>
          <Stack gap={4} style={{ minWidth: 0 }}>
            <Text fw={700}>{loan.customerName}</Text>
            <Group gap={6} align="baseline">
              <Text fw={800} size="lg">
                {formatMoneyShort(loan.principal)}
              </Text>
              <Text size="sm" c="dimmed">
                {loan.installments} x {formatMoneyShort(loan.installmentAmount)} ·{' '}
                {FREQUENCY_LABEL[loan.frequency]}
              </Text>
            </Group>
            <Group gap="xs">
              <Badge variant="light" color={STATUS_COLOR[loan.status]}>
                {STATUS_LABEL[loan.status]}
              </Badge>
              <Text size="xs" c="dimmed">
                {formatDate(loan.requestedAt)}
                {showSeller && ` · ${loan.sellerName}`}
              </Text>
            </Group>
            {loan.status === 'DISBURSED' && loan.installmentsCollected != null && (
              <Group gap="xs">
                <Text size="xs">
                  {loan.installmentsCollected}/{loan.installments} cobradas
                  {loan.nextDueDate && ` · próxima ${formatDate(loan.nextDueDate)}`}
                </Text>
                {loan.nextDueDate && loan.nextDueDate < todayIso() && (
                  <Badge size="xs" color="red" variant="filled">
                    Vencida
                  </Badge>
                )}
              </Group>
            )}
          </Stack>
        </Group>
        <IconChevronRight size={20} color="var(--mantine-color-dimmed)" />
      </Group>
    </Card>
  );
}
