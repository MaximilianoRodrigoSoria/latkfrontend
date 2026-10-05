import { Badge, Card, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import {
  IconCalculator,
  IconCash,
  IconChartLine,
  IconCoin,
  IconId,
  IconUserDollar,
  IconPackage,
  IconReceipt2,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, isSeller, Permission, roleLabel } from '../../auth/permissions';

interface Tile {
  title: string;
  description: string;
  icon: Icon;
  to?: string;
  soon?: boolean;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const canReadProducts = hasPermission(user, Permission.PRODUCT_READ);
  const products = useQuery({
    queryKey: queryKeys.products(true),
    queryFn: () => api.products(true),
    enabled: canReadProducts,
  });

  const canApprove = hasPermission(user, Permission.LOAN_APPROVE);
  const loans = useQuery({
    queryKey: queryKeys.loans,
    queryFn: api.loans,
    enabled: canApprove,
  });
  const pending = loans.data?.filter((l) => l.status === 'REQUESTED').length ?? 0;

  const tiles: Tile[] = [
    {
      title: 'Simular prestamo',
      description: 'Calcula cuotas sobre un producto',
      icon: IconCalculator,
      to: '/simulator',
    },
    {
      title: 'Productos',
      description: `${products.data?.length ?? 0} disponibles hoy`,
      icon: IconPackage,
      to: '/products',
    },
    { title: 'Clientes', description: 'Alta y cartera propia', icon: IconUsers, to: '/customers' },
    {
      title: 'Préstamos',
      description:
        canApprove && pending > 0
          ? `${pending} pendiente${pending === 1 ? '' : 's'} de aprobación`
          : 'Solicitudes y estado',
      icon: IconReceipt2,
      to: '/loans',
    },
    {
      title: 'Cobranzas',
      description: 'Préstamos en curso y cuotas a cobrar',
      icon: IconCash,
      to: '/loans?status=DISBURSED',
    },
    ...(hasPermission(user, Permission.SELLER_MANAGE)
      ? [
          {
            title: 'Vendedores',
            description: 'Alta, datos, CBU y comisión',
            icon: IconUserDollar,
            to: '/sellers',
          },
        ]
      : []),
    ...(hasPermission(user, Permission.PROFILE_MANAGE_OWN)
      ? [
          {
            title: 'Mis datos',
            description: 'Tu CBU y dónde transferir lo cobrado',
            icon: IconId,
            to: '/profile',
          },
        ]
      : []),
    ...(isSeller(user)
      ? [
          {
            title: 'Mis ganancias',
            description: 'Lo que ganaste este mes y lo que te falta cobrar',
            icon: IconCoin,
            to: '/earnings',
          },
        ]
      : []),
    {
      title: 'Estadísticas',
      description: 'Cobrado, por cobrar, mora y flujo por mes',
      icon: IconChartLine,
      to: '/stats',
    },
  ];

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
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 3 }}>
        {tiles.map((tile) =>
          tile.to && !tile.soon ? (
            <Card key={tile.title} withBorder padding="lg" component={Link} to={tile.to}>
              <TileContent tile={tile} />
            </Card>
          ) : (
            <Card key={tile.title} withBorder padding="lg" style={{ opacity: 0.6 }}>
              <TileContent tile={tile} />
            </Card>
          ),
        )}
      </SimpleGrid>
    </Stack>
  );
}

function TileContent({ tile }: { tile: Tile }) {
  return (
    <Group wrap="nowrap" align="center" gap="lg">
      <ThemeIcon size={48} variant="light" radius="md">
        <tile.icon size={24} />
      </ThemeIcon>
      <Stack gap={2}>
        <Group gap="xs">
          <Text fw={700}>{tile.title}</Text>
          {tile.soon && (
            <Badge size="xs" variant="outline">
              Proximamente
            </Badge>
          )}
        </Group>
        <Text size="sm" c="dimmed">
          {tile.description}
        </Text>
      </Stack>
    </Group>
  );
}
