import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconClipboardCheck, IconPlus, IconArrowRight } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, isSeller, Permission, roleLabel } from '../../auth/permissions';
import { InstallBanner } from '../../shared/install/InstallApp';
import { QuotaCard } from '../quota/QuotaCard';
import { PortfolioStatsPanel, usePortfolioStats } from '../stats/StatsPage';
import { ThisMonthCard } from './ThisMonthCard';
import { formatMoneyShort } from '../../shared/format';
import { loanCollectionState } from '../loans/collectionState';
import { useAchievementNotifications } from '../notifications/useAchievementNotifications';

/**
 * Inicio: lo importante de un vistazo. El vendedor ve su objetivo del mes; el admin, lo que espera
 * su aprobacion; todos, las estadisticas de su cartera. El resto se navega desde la barra
 * (Clientes, Prestamos con su simulador y productos, Ganancias o Vendedores).
 */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const seller = isSeller(user);

  const quota = useQuery({
    queryKey: queryKeys.myQuota,
    queryFn: api.myQuota,
    enabled: seller,
  });

  const canSeeStats = hasPermission(user, Permission.DASHBOARD_READ);
  useAchievementNotifications(quota.data);
  const stats = usePortfolioStats(canSeeStats);

  const canApprove = hasPermission(user, Permission.LOAN_APPROVE);
  const loans = useQuery({
    queryKey: queryKeys.loans,
    queryFn: api.loans,
  });
  const states = loans.data?.map((l) => loanCollectionState(l)) ?? [];
  const dueToday = states.filter((s) => s?.kind === 'TODAY').length;
  const late = states.filter((s) => s?.kind === 'OVERDUE').length;
  const pending = loans.data?.filter((l) => l.status === 'REQUESTED').length ?? 0;
  const toTransfer = loans.data?.filter((l) => l.status === 'APPROVED').length ?? 0;

  return (
    <Stack>
      <Group data-tour="page" justify="space-between" align="center" gap="md">
        <Stack gap={4}>
          <Title order={2} size="h3">
            Hola, {user?.fullName}
          </Title>
          <Badge variant="light" w="fit-content">
            {roleLabel(user)}
          </Badge>
        </Stack>

        <Group gap="xs" visibleFrom="sm">
          {hasPermission(user, Permission.LOAN_REQUEST) && (
            <Button component={Link} to="/loans/new" leftSection={<IconPlus size={18} />}>
              Nuevo préstamo
            </Button>
          )}
          <Button
            component={Link}
            to="/loans"
            variant="default"
            rightSection={<IconArrowRight size={18} />}
          >
            Ver préstamos
          </Button>
        </Group>
      </Group>

      {(dueToday > 0 || late > 0) && (
        <Alert color={late > 0 ? 'red' : 'blue'} title="Cobranza de hoy">
          <Stack gap="xs">
            <Text size="sm">
              {[
                dueToday > 0 && `${dueToday} para cobrar hoy`,
                late > 0 && `${late} atrasado${late === 1 ? '' : 's'}`,
              ]
                .filter(Boolean)
                .join(' · ')}
              {stats.data &&
                stats.data.overdue.amount > 0 &&
                ` (${stats.data.overdue.installments} ${stats.data.overdue.installments === 1 ? 'cuota vencida' : 'cuotas vencidas'} · ${formatMoneyShort(stats.data.overdue.amount)})`}
            </Text>
            <Anchor component={Link} to="/loans?status=TODAY" size="sm">
              Ver a quién cobrar
            </Anchor>
          </Stack>
        </Alert>
      )}

      {canApprove && (pending > 0 || toTransfer > 0) && (
        <Alert icon={<IconClipboardCheck />} color="orange" title="Para resolver">
          <Stack gap={2}>
            {pending > 0 && (
              <Anchor component={Link} to="/loans?status=REQUESTED" size="sm">
                {pending} solicitud{pending === 1 ? '' : 'es'} para aprobar
              </Anchor>
            )}
            {toTransfer > 0 && (
              <Anchor component={Link} to="/loans?status=APPROVED" size="sm">
                {toTransfer} préstamo{toTransfer === 1 ? '' : 's'} para transferir
              </Anchor>
            )}
          </Stack>
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, lg: seller && quota.data ? 2 : 1 }}>
        {stats.data && <ThisMonthCard stats={stats.data} seller={seller} />}
        {quota.data && <QuotaCard quota={quota.data} />}
      </SimpleGrid>

      {canSeeStats ? (
        <Accordion variant="separated" defaultValue={seller ? null : 'portfolio'}>
          <Accordion.Item value="portfolio">
            <Accordion.Control>Resumen y estadísticas de la cartera</Accordion.Control>
            <Accordion.Panel>
              <Stack>
                <PortfolioStatsPanel />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      ) : (
        <Text c="dimmed">Usá la barra para moverte por la app.</Text>
      )}
      <InstallBanner />
    </Stack>
  );
}
