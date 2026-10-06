import {
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { ProductResponse } from '../../api/types';
import { formatMoneyShort } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';
import { TIER_COLOR, TierIcon } from '../products/tiers';

/** Mismos ids, sin importar el orden. */
const sameSet = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((id) => b.has(id));

/**
 * Categorias que puede ofrecer el vendedor. Sin asignacion usa las de por defecto (las marcadas
 * "habilitada por defecto"); con asignacion, solo las tildadas, aunque esten ocultas por defecto.
 */
export function SellerCategoriesCard({ sellerId }: { sellerId: string }) {
  const queryClient = useQueryClient();
  const products = useQuery({
    queryKey: queryKeys.products(false),
    queryFn: () => api.products(false),
  });
  const categories = useQuery({
    queryKey: queryKeys.sellerCategories(sellerId),
    queryFn: () => api.sellerCategories(sellerId),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Al llegar la asignacion del servidor se cargan sus valores (una vez por respuesta).
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const serverKey = categories.data
    ? `${categories.data.restricted}-${categories.data.productIds.join(',')}`
    : null;
  if (categories.data && loadedFor !== serverKey) {
    setLoadedFor(serverKey);
    setSelected(new Set(categories.data.productIds));
  }

  const done = (message: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.sellerCategories(sellerId) });
    notifySuccess(message);
  };
  const save = useMutation({
    mutationFn: () => api.assignSellerCategories(sellerId, [...selected]),
    onSuccess: () => done('Categorías del vendedor guardadas'),
    onError: (error) => notifyError(error),
  });
  const reset = useMutation({
    mutationFn: () => api.resetSellerCategories(sellerId),
    onSuccess: () => done('El vendedor volvió a las categorías por defecto'),
    onError: (error) => notifyError(error),
  });

  const toggle = (id: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const restricted = categories.data?.restricted ?? false;
  const unchanged =
    categories.data !== undefined && sameSet(selected, new Set(categories.data.productIds));

  return (
    <Card withBorder padding="md">
      <Group justify="space-between" wrap="nowrap" mb={4}>
        <Text fw={700}>Categorías que puede ofrecer</Text>
        <Badge variant="light" color={restricted ? 'brand' : 'gray'}>
          {restricted ? 'Asignadas' : 'Por defecto'}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed" mb="sm">
        {restricted
          ? 'Ve solo las categorías tildadas, aunque estén ocultas para el resto.'
          : 'Usa las categorías habilitadas por defecto. Tildá las que quieras para asignarle otras.'}
      </Text>

      {(products.isLoading || categories.isLoading) && <Skeleton h={120} />}
      {products.data && categories.data && (
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
          {products.data.map((product) => (
            <CategoryOption
              key={product.id}
              product={product}
              checked={selected.has(product.id)}
              onChange={(checked) => toggle(product.id, checked)}
            />
          ))}
        </SimpleGrid>
      )}

      <Group justify="flex-end" mt="md">
        {restricted && (
          <Button variant="subtle" onClick={() => reset.mutate()} loading={reset.isPending}>
            Volver a las por defecto
          </Button>
        )}
        <Button
          variant="light"
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={selected.size === 0 || (restricted && unchanged)}
        >
          Guardar categorías
        </Button>
      </Group>
      {selected.size === 0 && categories.data && (
        <Text size="xs" c="red" ta="right" mt={4}>
          Elegí al menos una categoría.
        </Text>
      )}
    </Card>
  );
}

function CategoryOption({
  product,
  checked,
  onChange,
}: {
  product: ProductResponse;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const color = product.tier ? TIER_COLOR[product.tier] : undefined;
  const amounts = product.allowedAmounts;
  return (
    <Card
      withBorder
      padding="xs"
      radius="md"
      style={checked && color ? { borderColor: color } : undefined}
    >
      <Checkbox
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        aria-label={`Categoría ${product.tierLabel ?? product.name}`}
        label={
          <Group gap="xs" wrap="nowrap">
            <TierIcon tier={product.tier} size={22} />
            <Stack gap={0}>
              <Text size="sm" fw={600}>
                {product.tierLabel ?? product.name}
              </Text>
              <Text size="xs" c="dimmed">
                hasta {formatMoneyShort(amounts.at(-1) ?? 0)}
                {!product.sellerVisible && ' · oculta por defecto'}
                {!product.active && ' · inactiva'}
              </Text>
            </Stack>
          </Group>
        }
      />
    </Card>
  );
}
