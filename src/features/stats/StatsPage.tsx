import { BarChart } from '@mantine/charts';
import {
  Badge,
  Card,
  Group,
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconCircleX, type Icon } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '../../api/endpoints';
import type { DelinquencyLevel, LoanStatus, PortfolioStats } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, Permission } from '../../auth/permissions';
import { formatMoneyShort } from '../../shared/format';
import { STATUS_COLOR, STATUS_LABEL } from '../loans/loanDraft';

/** Mora: color de estado + icono + texto (nunca solo color). */
export const LEVEL: Record<DelinquencyLevel, { label: string; color: string; icon: Icon }> = {
  BIEN: { label: 'Bien', color: 'teal', icon: IconCircleCheck },
  MEDIA: { label: 'Media', color: 'yellow', icon: IconAlertTriangle },
  ALTA: { label: 'Alta', color: 'red', icon: IconCircleX },
};

const percent = (ratio: number) =>
  `${(ratio * 100).toLocaleString('es-AR', { maximumFractionDigits: 0 })} %`;

/** "2026-10" -> "oct 26" */
export function shortMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { month: 'short', year: '2-digit' })
    .format(new Date(y!, m! - 1, 1))
    .replace('.', '')
    .replace(' de ', ' ');
}

/** Indicadores: el admin ve toda la cartera y el detalle por vendedor; el vendedor, lo suyo. */
/** Indicadores de la cartera (sin titulo): el admin ve todo y el detalle por vendedor; el vendedor, lo suyo. */
export function PortfolioStatsPanel() {
  const user = useAuthStore((s) => s.user);
  const seesAll = hasPermission(user, Permission.LOAN_READ_ALL);
  const stats = useQuery({
    queryKey: queryKeys.portfolioStats,
    queryFn: api.portfolioStats,
    refetchInterval: 60_000,
  });
  const s = stats.data;

  return (
    <>
      {stats.isLoading && <Skeleton h={400} />}
      {stats.isError && <Text c="red">{stats.error.message}</Text>}
      {s && <StatsView stats={s} seesAll={seesAll} />}
    </>
  );
}

function StatsView({ stats: s, seesAll }: { stats: PortfolioStats; seesAll: boolean }) {
  const level = LEVEL[s.overdue.level];
  const monthTotal = s.collectedThisMonth.amount + s.dueThisMonth.amount;
  const chart = s.months.map((m) => ({
    mes: shortMonth(m.month),
    Cobrado: m.collected,
    'Por cobrar': m.pending,
  }));

  return (
    <>
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Kpi label="Prestado" value={s.lent} />
        <Kpi label="Cobrado" value={s.collected} color="teal" />
        <Kpi label="Por cobrar" value={s.toCollect} />
        <Kpi
          label="Vencido"
          value={s.overdue.amount}
          color={s.overdue.amount > 0 ? 'red' : undefined}
          hint={`${s.overdue.installments} cuota${s.overdue.installments === 1 ? '' : 's'}`}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Card withBorder padding="md">
          <Text fw={700}>Este mes</Text>
          <Group gap={6} align="baseline" mt={4}>
            <Text fw={800} size="xl" c="teal">
              {formatMoneyShort(s.collectedThisMonth.amount)}
            </Text>
            <Text size="sm" c="dimmed">
              cobrado de {formatMoneyShort(monthTotal)}
            </Text>
          </Group>
          <Progress
            mt="xs"
            value={monthTotal ? (s.collectedThisMonth.amount / monthTotal) * 100 : 0}
            color="teal"
            aria-label="Cobrado del mes"
          />
          <Text size="sm" mt="xs">
            Vencen en los próximos 7 días: <b>{s.dueNext7Days.installments}</b> cuotas ·{' '}
            <b>{formatMoneyShort(s.dueNext7Days.amount)}</b>
          </Text>
        </Card>

        <Card withBorder padding="md">
          <Group justify="space-between">
            <Text fw={700}>Morosidad</Text>
            <LevelBadge level={s.overdue.level} />
          </Group>
          <Group gap="sm" mt="xs" wrap="nowrap">
            <ThemeIcon size={44} radius="xl" variant="light" color={level.color}>
              <level.icon size={24} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text fw={800} size="xl">
                {percent(s.overdue.ratio)}
              </Text>
              <Text size="sm" c="dimmed">
                {s.overdue.loansWithOverdue} de {s.overdue.activeLoans} préstamos en cobranza con
                cuotas vencidas
              </Text>
            </Stack>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            Bien hasta 20 %, Media hasta 50 %, Alta más de 50 %.
          </Text>
        </Card>
      </SimpleGrid>

      <Card withBorder padding="md">
        <Text fw={700}>Flujo por mes</Text>
        <Text size="xs" c="dimmed" mb="sm">
          Cobrado según la fecha de cobro; por cobrar según el vencimiento. Juntos: lo del mes.
        </Text>
        <BarChart
          h={240}
          data={chart}
          dataKey="mes"
          type="stacked"
          series={[
            { name: 'Cobrado', color: 'teal.6' },
            { name: 'Por cobrar', color: 'gray.5' },
          ]}
          valueFormatter={formatMoneyShort}
          withLegend
          legendProps={{ verticalAlign: 'bottom' }}
          barProps={{ radius: 2 }}
          tickLine="none"
          gridAxis="y"
        />
      </Card>

      <SimpleGrid cols={{ base: 1, sm: seesAll ? 2 : 1 }}>
        <Card withBorder padding="md">
          <Text fw={700} mb="xs">
            Préstamos por estado
          </Text>
          <Stack gap={6}>
            {(Object.keys(STATUS_LABEL) as LoanStatus[]).map((status) => (
              <Group key={status} justify="space-between">
                <Badge variant="light" color={STATUS_COLOR[status]}>
                  {STATUS_LABEL[status]}
                </Badge>
                <Text fw={700}>{s.loansByStatus[status] ?? 0}</Text>
              </Group>
            ))}
          </Stack>
        </Card>

        {seesAll && s.commissionsGenerated != null && (
          <Card withBorder padding="md">
            <Text fw={700} mb="xs">
              Rentabilidad de lo cobrado
            </Text>
            <Stack gap={6}>
              <Row label="Interés cobrado" value={s.interestCollected} />
              <Row label="Comisiones de vendedores" value={-s.commissionsGenerated} />
              <Row
                label="Ganancia neta"
                value={s.interestCollected - s.commissionsGenerated}
                strong
              />
            </Stack>
          </Card>
        )}
      </SimpleGrid>

      {seesAll && s.sellers.length > 0 && (
        <Stack gap="xs">
          <Text fw={700}>Por vendedor</Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {s.sellers.map((v) => (
              <Card key={v.sellerId} withBorder padding="md">
                <Group justify="space-between" wrap="nowrap" mb={6}>
                  <Text fw={700} truncate>
                    {v.sellerName}
                  </Text>
                  <LevelBadge level={v.level} />
                </Group>
                <Text size="xs" c="dimmed" mb="xs">
                  {v.activeLoans} en cobranza · {v.loansWithOverdue} con vencidas (
                  {percent(v.delinquencyRatio)})
                </Text>
                <Stack gap={4}>
                  <Row label="Prestado" value={v.lent} />
                  <Row label="Cobrado" value={v.collected} />
                  <Row label="Por cobrar" value={v.toCollect} />
                  <Row label="Vencido" value={v.overdueAmount} danger={v.overdueAmount > 0} />
                  <Row label="Comisiones" value={v.commissionsGenerated} />
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      )}
    </>
  );
}

function Kpi({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: number;
  color?: string;
  hint?: string;
}) {
  return (
    <Card withBorder padding="md">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={800} size="lg" c={color}>
        {formatMoneyShort(value)}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Card>
  );
}

export function LevelBadge({ level }: { level: DelinquencyLevel }) {
  const l = LEVEL[level];
  return (
    <Badge color={l.color} variant="light" leftSection={<l.icon size={12} />}>
      {l.label}
    </Badge>
  );
}

function Row({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: number;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={strong ? 800 : 600} c={danger ? 'red' : undefined}>
        {formatMoneyShort(value)}
      </Text>
    </Group>
  );
}
