import { ContentMotion } from '../../shared/components/MobileMotion';
import {
  Anchor,
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  Modal,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconCalculator, IconEye, IconEyeOff, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import type { ProductOffer, ProductResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, isSeller, Permission } from '../../auth/permissions';
import { LoansSectionTabs } from '../loans/LoansSectionTabs';
import { PageHeader } from '../../shared/components/PageHeader';
import {
  FREQUENCY_LABEL,
  formatDate,
  formatMoney,
  formatMoneyShort,
  formatRate,
  PERIOD_LABEL,
} from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';
import { NEW_PARAM, useOpenFromQuery } from '../../shared/useOpenFromQuery';
import { ProductForm } from './ProductForm';
import { RevealEarningsModal } from './RevealEarningsModal';
import { offerAmounts, offerInstallments, offerLabel, rateRange, TierIcon } from './tiers';
import { useEarnings } from './useEarnings';

export function ProductsPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = hasPermission(user, Permission.PRODUCT_MANAGE);
  const [params] = useSearchParams();
  const [view, setView] = useState<'offers' | 'manage'>('offers');
  // El "+" de la barra inferior pide una categoria nueva: se pasa a Administrar.
  const requested = canManage && params.has(NEW_PARAM);
  if (requested && view !== 'manage') setView('manage');

  return (
    <Stack pb={canManage ? 88 : 0}>
      <LoansSectionTabs />
      <PageHeader
        title="Productos"
        description={
          view === 'offers'
            ? 'Categorías: hasta cuánto podés prestar y en cuántas cuotas'
            : 'Condiciones con las que se originan los préstamos'
        }
      />
      {canManage && (
        <SegmentedControl
          value={view}
          onChange={(v) => setView(v as 'offers' | 'manage')}
          data={[
            { value: 'offers', label: 'Categorías' },
            { value: 'manage', label: 'Administrar' },
          ]}
        />
      )}
      <ContentMotion key={view}>
        {view === 'offers' ? <OffersView /> : <ManageView />}
      </ContentMotion>
    </Stack>
  );
}

function OffersView() {
  const user = useAuthStore((s) => s.user);
  const seller = isSeller(user) && hasPermission(user, Permission.COMMISSION_READ_OWN);
  const [passwordOpened, password] = useDisclosure(false);
  const { earnings, reveal, hide } = useEarnings();
  const offers = useQuery({ queryKey: queryKeys.offers, queryFn: api.offers });

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
          {earnings ? 'Ocultar mi ganancia' : 'Ver cuánto gano'}
        </Button>
      )}

      {offers.isLoading && <Skeleton h={120} />}
      {offers.data?.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          No hay productos disponibles hoy.
        </Text>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {offers.data?.map((offer) => (
          <CategoryCard
            key={offer.productId}
            offer={offer}
            earnings={earnings?.get(offer.productId)}
          />
        ))}
      </SimpleGrid>

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

/**
 * Una categoria: rango de montos y cuotas y lo que se paga por cuota. El vendedor no ve tasas; con
 * la contrasena confirmada ve hasta cuanto gana. El admin ve recargo y tasas.
 */
export function CategoryCard({
  offer,
  earnings,
}: {
  offer: ProductOffer;
  earnings?: ProductOffer;
}) {
  const amounts = offerAmounts(offer);
  const installments = offerInstallments(offer);
  const period = PERIOD_LABEL[offer.frequency];
  const cuotas = offer.options.map((o) => o.installmentAmount);
  const rates = rateRange(offer);
  const maxEarning = earnings
    ? Math.max(...earnings.options.map((o) => o.totalCommission ?? 0))
    : null;

  return (
    <Card withBorder padding="md" radius="md">
      <Group justify="space-between" wrap="nowrap" mb="xs">
        <Group gap="sm" wrap="nowrap">
          <TierIcon tier={offer.tier} size={34} />
          <div>
            <Text fw={800} size="lg" lh={1.2}>
              {offerLabel(offer)}
            </Text>
            <Text size="xs" c="dimmed">
              {FREQUENCY_LABEL[offer.frequency]}
            </Text>
          </div>
        </Group>
        {!offer.sellerVisible && (
          <Badge color="orange" variant="light">
            Oculta por defecto
          </Badge>
        )}
      </Group>
      <Stack gap={4}>
        <Text size="sm">
          Hasta <b>{formatMoneyShort(amounts.at(-1) ?? 0)}</b> · desde{' '}
          {formatMoneyShort(amounts[0] ?? 0)}
        </Text>
        <Text size="sm">
          De {installments[0]} a {installments.at(-1)} cuotas {period}es
        </Text>
        <Text size="sm" c="dimmed">
          Cuota {period} de {formatMoneyShort(Math.min(...cuotas))} a{' '}
          {formatMoneyShort(Math.max(...cuotas))}
        </Text>
        {offer.surcharge != null && rates && (
          <Text size="xs" c="orange.8" fw={600}>
            Recargo +{formatRate(offer.surcharge)} · tasa {formatRate(rates[0])} a{' '}
            {formatRate(rates[1])} {period}
          </Text>
        )}
        {offer.surcharge == null && offer.ratePerPeriod != null && (
          <Text size="xs" c="orange.8" fw={600}>
            Tasa {formatRate(offer.ratePerPeriod)} {period}
          </Text>
        )}
        {maxEarning !== null && (
          <Text size="sm" c="teal" fw={700}>
            Ganás hasta {formatMoney(maxEarning)} por préstamo
          </Text>
        )}
      </Stack>
      <Anchor component={Link} to="/simulator" size="sm" mt="sm">
        <Group gap={4}>
          <IconCalculator size={16} /> Simular
        </Group>
      </Anchor>
    </Card>
  );
}

function ManageView() {
  const [filter, setFilter] = useState<'available' | 'all'>('all');
  const [opened, { open, close }] = useDisclosure(false);
  const mobile = useMediaQuery('(max-width: 48em)');
  useOpenFromQuery(open);
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

  const [toDelete, setToDelete] = useState<ProductResponse | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => {
      notifySuccess(`"${toDelete?.name}" dada de baja`);
      setToDelete(null);
      refresh();
    },
    onError: (error) => notifyError(error),
  });

  const visibility = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      api.changeProductVisibility(id, visible),
    onSuccess: (product) => {
      notifySuccess(
        product.sellerVisible
          ? `${product.name}: visible para los vendedores`
          : `${product.name}: oculta para los vendedores`,
      );
      refresh();
    },
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
            toggling={
              (toggle.isPending && toggle.variables?.id === product.id) ||
              (visibility.isPending && visibility.variables?.id === product.id)
            }
            onToggle={(active) => toggle.mutate({ id: product.id, active })}
            onVisibility={(visible) => visibility.mutate({ id: product.id, visible })}
            onDelete={() => setToDelete(product)}
          />
        ))}
      </SimpleGrid>
      <Modal
        opened={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Dar de baja la categoría"
        centered
      >
        <Stack>
          <Text size="sm">
            <b>{toDelete?.name}</b> deja de existir para vendedores y administradores. Los préstamos
            que ya la usan conservan sus condiciones.
          </Text>
          <Text size="sm" c="dimmed">
            Si solo querés pausarla por un tiempo, usá el interruptor &quot;Activo&quot;.
          </Text>
          <Group grow>
            <Button variant="default" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              color="red"
              loading={remove.isPending}
              onClick={() => toDelete && remove.mutate(toDelete.id)}
            >
              Dar de baja
            </Button>
          </Group>
        </Stack>
      </Modal>

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
  onVisibility: (visible: boolean) => void;
  onDelete: () => void;
}

function ProductCard({ product, toggling, onToggle, onVisibility, onDelete }: ProductCardProps) {
  const amounts = product.allowedAmounts;
  const period = PERIOD_LABEL[product.frequency];
  const rates = Object.entries(product.ratesByInstallments ?? {}).sort(
    ([a], [b]) => Number(a) - Number(b),
  );
  return (
    <Card withBorder padding="md">
      <Group justify="space-between" wrap="nowrap" mb="xs">
        <Group gap="xs" wrap="nowrap">
          <TierIcon tier={product.tier} size={26} />
          <Text fw={700} lineClamp={1}>
            {product.tierLabel ?? product.name}
          </Text>
        </Group>
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
            (product.tier
              ? ` · recargo +${formatRate(product.ratePerPeriod)}`
              : ` · ${formatRate(product.ratePerPeriod)} ${period}`)}
        </Text>
        <Text size="sm" c="dimmed">
          {product.tier
            ? `Montos: ${formatMoneyShort(amounts[0] ?? 0)} a ${formatMoneyShort(amounts.at(-1) ?? 0)}, de $5.000 en $5.000`
            : `Montos: ${amounts.map(formatMoneyShort).join(' · ')}`}
        </Text>
        <Text size="sm" c="dimmed">
          Cuotas: {product.allowedInstallments[0]} a {product.allowedInstallments.at(-1)} · Gracia{' '}
          {product.graceDays} días
        </Text>
        {product.tier && rates.length > 0 && (
          <Text size="xs" c="dimmed">
            Tasa {period} por cuotas: {rates.map(([n, r]) => `${n}: ${formatRate(r)}`).join(' · ')}
          </Text>
        )}
        {(product.validFrom || product.validTo) && (
          <Text size="xs" c="dimmed">
            Vigencia: {product.validFrom ? formatDate(product.validFrom) : '...'} al{' '}
            {product.validTo ? formatDate(product.validTo) : '...'}
          </Text>
        )}
      </Stack>
      <Group mt="md" gap="lg">
        <Switch
          label={product.active ? 'Activo' : 'Inactivo'}
          checked={product.active}
          disabled={toggling}
          onChange={(event) => onToggle(event.currentTarget.checked)}
        />
        <Switch
          label="Habilitada por defecto para vendedores"
          checked={product.sellerVisible}
          disabled={toggling}
          onChange={(event) => onVisibility(event.currentTarget.checked)}
        />
      </Group>
      <Text size="xs" c="dimmed" mt={6}>
        A cada vendedor se le pueden asignar otras categorías desde su ficha.
      </Text>
      <Group justify="flex-end" mt="xs">
        <Button
          variant="subtle"
          color="red"
          size="xs"
          leftSection={<IconTrash size={14} />}
          onClick={onDelete}
        >
          Dar de baja
        </Button>
      </Group>
    </Card>
  );
}
