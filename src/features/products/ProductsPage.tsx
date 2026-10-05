import {
  Affix,
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { ProductResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, Permission } from '../../auth/permissions';
import { PageHeader } from '../../shared/components/PageHeader';
import {
  FREQUENCY_LABEL,
  formatDate,
  formatMoneyShort,
  formatRate,
  PERIOD_LABEL,
} from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';
import { ProductForm } from './ProductForm';

export function ProductsPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = hasPermission(user, Permission.PRODUCT_MANAGE);
  const [filter, setFilter] = useState<'available' | 'all'>('available');
  const [opened, { open, close }] = useDisclosure(false);
  const mobile = useMediaQuery('(max-width: 48em)');
  const queryClient = useQueryClient();
  const onlyAvailable = filter === 'available';

  const products = useQuery({
    queryKey: queryKeys.products(onlyAvailable),
    queryFn: () => api.products(onlyAvailable),
  });

  const create = useMutation({
    mutationFn: api.createProduct,
    onSuccess: (product) => {
      notifySuccess(`Producto "${product.name}" creado`);
      close();
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => notifyError(error),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.changeProductStatus(id, active),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['products'] }),
    onError: (error) => notifyError(error),
  });

  return (
    <Stack pb={canManage ? 80 : 0}>
      <PageHeader
        title="Productos de credito"
        description="Condiciones con las que se originan los prestamos"
        action={
          canManage && !mobile ? (
            <Button leftSection={<IconPlus size={18} />} onClick={open}>
              Nuevo
            </Button>
          ) : undefined
        }
      />
      <SegmentedControl
        value={filter}
        onChange={(v) => setFilter(v as 'available' | 'all')}
        data={[
          { value: 'available', label: 'Disponibles' },
          { value: 'all', label: 'Todos' },
        ]}
      />

      {products.isLoading && <Skeleton h={160} />}
      {products.data?.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          No hay productos {onlyAvailable ? 'disponibles' : 'cargados'}.
        </Text>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {products.data?.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            canManage={canManage}
            toggling={toggle.isPending && toggle.variables?.id === product.id}
            onToggle={(active) => toggle.mutate({ id: product.id, active })}
          />
        ))}
      </SimpleGrid>

      {canManage && mobile && (
        <Affix position={{ bottom: 'calc(80px + env(safe-area-inset-bottom))', right: 20 }}>
          <Button radius="xl" size="lg" leftSection={<IconPlus size={20} />} onClick={open}>
            Nuevo
          </Button>
        </Affix>
      )}

      <Drawer
        opened={opened}
        onClose={close}
        title="Nuevo producto"
        position={mobile ? 'bottom' : 'right'}
        size={mobile ? '92%' : 'md'}
        radius={mobile ? 'lg' : 0}
      >
        <ProductForm submitting={create.isPending} onSubmit={(request) => create.mutate(request)} />
      </Drawer>
    </Stack>
  );
}

interface ProductCardProps {
  product: ProductResponse;
  canManage: boolean;
  toggling: boolean;
  onToggle: (active: boolean) => void;
}

function ProductCard({ product, canManage, toggling, onToggle }: ProductCardProps) {
  return (
    <Card withBorder padding="md">
      <Group justify="space-between" wrap="nowrap" mb="xs">
        <Text fw={700} lineClamp={1}>
          {product.name}
        </Text>
        <Badge color={product.availableToday ? 'teal' : 'gray'} variant="light">
          {product.availableToday
            ? 'Disponible'
            : product.active
              ? 'Fuera de vigencia'
              : 'Inactivo'}
        </Badge>
      </Group>
      <Stack gap={4}>
        <Text size="sm">
          {FREQUENCY_LABEL[product.frequency]} · {formatRate(product.ratePerPeriod)}{' '}
          {PERIOD_LABEL[product.frequency]}
        </Text>
        <Text size="sm" c="dimmed">
          Montos: {product.allowedAmounts.map(formatMoneyShort).join(' · ')}
        </Text>
        <Text size="sm" c="dimmed">
          Cuotas: {product.allowedInstallments.join(' · ')} · Gracia {product.graceDays} dias
        </Text>
        {(product.validFrom || product.validTo) && (
          <Text size="xs" c="dimmed">
            Vigencia: {product.validFrom ? formatDate(product.validFrom) : '...'} al{' '}
            {product.validTo ? formatDate(product.validTo) : '...'}
          </Text>
        )}
      </Stack>
      {canManage && (
        <Switch
          mt="md"
          label={product.active ? 'Activo' : 'Inactivo'}
          checked={product.active}
          disabled={toggling}
          onChange={(event) => onToggle(event.currentTarget.checked)}
        />
      )}
    </Card>
  );
}
