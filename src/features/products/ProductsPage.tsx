import {
  Affix,
  Badge,
  Button,
  Chip,
  Card,
  Drawer,
  Group,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconEye, IconEyeOff, IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { OfferOption, ProductResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, isSeller, Permission } from '../../auth/permissions';
import { LoansSectionTabs } from '../loans/LoansSectionTabs';
import { PageHeader } from '../../shared/components/PageHeader';
import {
  FREQUENCY_LABEL,
  formatDate,
  formatMoneyShort,
  formatRate,
  PERIOD_LABEL,
} from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';
import { LoanAmountCard } from './LoanAmountCard';
import {
  applyFilters,
  availableAmounts,
  type FrequencyFilter,
  type OfferFilters,
} from './offerFilters';
import { ProductForm } from './ProductForm';
import { RevealEarningsModal } from './RevealEarningsModal';
import { useEarnings } from './useEarnings';

export function ProductsPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = hasPermission(user, Permission.PRODUCT_MANAGE);
  const [view, setView] = useState<'offers' | 'manage'>('offers');

  return (
    <Stack pb={canManage ? 88 : 0}>
      <LoansSectionTabs />
      <PageHeader
        title="Productos"
        description={
          view === 'offers'
            ? 'Cuanto podes prestar hoy y en cuantas cuotas'
            : 'Condiciones con las que se originan los prestamos'
        }
      />
      {canManage && (
        <SegmentedControl
          value={view}
          onChange={(v) => setView(v as 'offers' | 'manage')}
          data={[
            { value: 'offers', label: 'Ofertas' },
            { value: 'manage', label: 'Administrar' },
          ]}
        />
      )}
      {view === 'offers' ? <OffersView /> : <ManageView />}
    </Stack>
  );
}

function OffersView() {
  const user = useAuthStore((s) => s.user);
  const seller = isSeller(user) && hasPermission(user, Permission.COMMISSION_READ_OWN);
  const [passwordOpened, password] = useDisclosure(false);
  const { earnings, reveal, hide } = useEarnings();
  const offers = useQuery({ queryKey: queryKeys.offers, queryFn: api.offers });
  const [filters, setFilters] = useState<OfferFilters>({ frequency: 'ALL', amount: null });
  const amounts = availableAmounts(offers.data ?? []);
  const visible = applyFilters(offers.data ?? [], filters);

  const confirm = (value: string) =>
    reveal.mutate(value, {
      onSuccess: () => {
        password.close();
        reveal.reset();
      },
    });

  return (
    <Stack>
      {seller && offers.data && offers.data.length > 0 && (
        <Button
          variant={earnings ? 'light' : 'subtle'}
          color={earnings ? 'gray' : 'teal'}
          leftSection={earnings ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          onClick={earnings ? hide : password.open}
        >
          {earnings ? 'Ocultar mi ganancia' : 'Ver cuanto gano'}
        </Button>
      )}

      {offers.data && offers.data.length > 0 && (
        <Stack gap="xs">
          <SegmentedControl
            fullWidth
            value={filters.frequency}
            onChange={(value) => setFilters((f) => ({ ...f, frequency: value as FrequencyFilter }))}
            data={[
              { value: 'ALL', label: 'Todos' },
              { value: 'WEEKLY', label: 'Semanal' },
              { value: 'MONTHLY', label: 'Mensual' },
            ]}
          />
          <ScrollArea type="never">
            <Chip.Group
              value={filters.amount === null ? 'ALL' : String(filters.amount)}
              onChange={(value) =>
                setFilters((f) => ({
                  ...f,
                  amount: value === 'ALL' ? null : Number(value),
                }))
              }
            >
              <Group gap="xs" wrap="nowrap">
                <Chip value="ALL">Todos los montos</Chip>
                {amounts.map((amount) => (
                  <Chip key={amount} value={String(amount)}>
                    {formatMoneyShort(amount)}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </ScrollArea>
        </Stack>
      )}

      {offers.isLoading && <Skeleton h={120} />}
      {offers.data?.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          No hay productos disponibles hoy.
        </Text>
      )}
      {offers.data && offers.data.length > 0 && visible.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          No hay productos con ese filtro.
        </Text>
      )}

      {visible.map((offer) => {
        const withEarnings = earnings?.get(offer.productId);
        return (
          <Stack key={offer.productId} gap="xs">
            <Group justify="space-between" align="baseline">
              <Text fw={800} size="lg">
                {offer.productName}
              </Text>
              {offer.ratePerPeriod != null && (
                <Text size="xs" c="dimmed">
                  Tasa {formatRate(offer.ratePerPeriod)} {PERIOD_LABEL[offer.frequency]}
                </Text>
              )}
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
              {amountsOf(offer.options).map((amount) => (
                <LoanAmountCard
                  key={amount}
                  frequency={offer.frequency}
                  amount={amount}
                  options={offer.options.filter((o) => o.amount === amount)}
                  earnings={withEarnings?.options.filter((o) => o.amount === amount)}
                />
              ))}
            </SimpleGrid>
          </Stack>
        );
      })}

      <RevealEarningsModal
        opened={passwordOpened}
        loading={reveal.isPending}
        error={reveal.isError ? reveal.error.message : null}
        onClose={() => {
          reveal.reset();
          password.close();
        }}
        onConfirm={confirm}
      />
    </Stack>
  );
}

function amountsOf(options: OfferOption[]): number[] {
  return [...new Set(options.map((o) => o.amount))].sort((a, b) => a - b);
}

function ManageView() {
  const [filter, setFilter] = useState<'available' | 'all'>('all');
  const [opened, { open, close }] = useDisclosure(false);
  const mobile = useMediaQuery('(max-width: 48em)');
  const queryClient = useQueryClient();
  const onlyAvailable = filter === 'available';

  const products = useQuery({
    queryKey: queryKeys.products(onlyAvailable),
    queryFn: () => api.products(onlyAvailable),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.offers });
  };

  const create = useMutation({
    mutationFn: api.createProduct,
    onSuccess: (product) => {
      notifySuccess(`Producto "${product.name}" creado`);
      close();
      refresh();
    },
    onError: (error) => notifyError(error),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.changeProductStatus(id, active),
    onSuccess: refresh,
    onError: (error) => notifyError(error),
  });

  return (
    <Stack>
      <Group justify="space-between" wrap="nowrap">
        <SegmentedControl
          size="xs"
          value={filter}
          onChange={(v) => setFilter(v as 'available' | 'all')}
          data={[
            { value: 'all', label: 'Todos' },
            { value: 'available', label: 'Disponibles' },
          ]}
        />
        {!mobile && (
          <Button leftSection={<IconPlus size={18} />} onClick={open}>
            Nuevo
          </Button>
        )}
      </Group>

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
            toggling={toggle.isPending && toggle.variables?.id === product.id}
            onToggle={(active) => toggle.mutate({ id: product.id, active })}
          />
        ))}
      </SimpleGrid>

      {mobile && (
        <Affix position={{ bottom: 'calc(88px + env(safe-area-inset-bottom))', right: 20 }}>
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
  toggling: boolean;
  onToggle: (active: boolean) => void;
}

function ProductCard({ product, toggling, onToggle }: ProductCardProps) {
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
          {FREQUENCY_LABEL[product.frequency]}
          {product.ratePerPeriod != null &&
            ` · ${formatRate(product.ratePerPeriod)} ${PERIOD_LABEL[product.frequency]}`}
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
      <Switch
        mt="md"
        label={product.active ? 'Activo' : 'Inactivo'}
        checked={product.active}
        disabled={toggling}
        onChange={(event) => onToggle(event.currentTarget.checked)}
      />
    </Card>
  );
}
