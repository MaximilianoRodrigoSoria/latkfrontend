import { Alert, Anchor, Badge, Stack, Text, Title } from '@mantine/core';
import { IconClipboardCheck } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, isSeller, Permission, roleLabel } from '../../auth/permissions';
import { InstallBanner } from '../../shared/install/InstallApp';
import { QuotaCard } from '../quota/QuotaCard';
import { PortfolioStatsPanel, usePortfolioStats } from '../stats/StatsPage';
import { ThisMonthCard } from './ThisMonthCard';

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
  const stats = usePortfolioStats(canSeeStats);

  const canApprove = hasPermission(user, Permission.LOAN_APPROVE);
  const loans = useQuery({
    queryKey: queryKeys.loans,
    queryFn: api.loans,
    enabled: canApprove,
  });
  const pending = loans.data?.filter((l) => l.status === 'REQUESTED').length ?? 0;
  const toTransfer = loans.data?.filter((l) => l.status === 'APPROVED').length ?? 0;

  return (
    <Stack>
      <Stack gap={4}>
        <Title order={2} size="h3">
          Hola, {user?.fullName}
        </Title>
        <Badge variant="light" w="fit-content">
          {roleLabel(user)}
        </Badge>
      </Stack>

      <InstallBanner />

      {/* Lo mas destacado: cuanto gana este mes y su objetivo. */}
      {stats.data && <ThisMonthCard stats={stats.data} seller={seller} />}
      {quota.data && <QuotaCard quota={quota.data} />}

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

      {canSeeStats ? (
        <PortfolioStatsPanel />
      ) : (
        <Text c="dimmed">Usá la barra para moverte por la app.</Text>
      )}
    </Stack>
  );
}
