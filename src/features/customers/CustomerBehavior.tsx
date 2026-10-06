import { Badge, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '../../api/endpoints';
import type { PaymentBehavior, PaymentRating } from '../../api/types';
import { Foldable } from '../../shared/components/Foldable';

export const RATING_LABEL: Record<PaymentRating, string> = {
  NO_HISTORY: 'Sin historial',
  PUNCTUAL: 'Puntual',
  REGULAR: 'Regular',
  RISKY: 'Riesgoso',
};

const RATING_COLOR: Record<PaymentRating, string> = {
  NO_HISTORY: 'gray',
  PUNCTUAL: 'teal',
  REGULAR: 'yellow',
  RISKY: 'red',
};

export function useCustomerBehavior(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customerBehavior(customerId ?? ''),
    queryFn: () => api.customerBehavior(customerId!),
    enabled: !!customerId,
  });
}

export function RatingBadge({ rating }: { rating: PaymentRating }) {
  return (
    <Badge variant="light" color={RATING_COLOR[rating]} style={{ textTransform: 'none' }}>
      {RATING_LABEL[rating]}
    </Badge>
  );
}

/** "9 de 10 cuotas a tiempo · 2,5 días de atraso promedio". */
export function behaviorSummary(b: PaymentBehavior): string {
  if (b.rating === 'NO_HISTORY') return 'Todavía no venció ni se cobró ninguna cuota.';
  const parts = [`${b.onTime} de ${b.evaluated} cuotas a tiempo`];
  if (b.late > 0) {
    parts.push(
      `${b.averageDaysLate.toLocaleString('es-AR')} día${b.averageDaysLate === 1 ? '' : 's'} de atraso promedio`,
    );
  }
  return parts.join(' · ');
}

/**
 * Puntualidad del cliente: el badge a la vista y los numeros al desplegar. Lo ve el vendedor en la
 * ficha y el admin al decidir una solicitud.
 */
export function CustomerBehaviorCard({
  customerId,
  defaultOpen,
}: {
  customerId: string;
  defaultOpen?: boolean;
}) {
  const behavior = useCustomerBehavior(customerId);
  const b = behavior.data;
  if (!b) return null;
  return (
    <Foldable title="Cómo paga" aside={<RatingBadge rating={b.rating} />} defaultOpen={defaultOpen}>
      <Stack gap="xs">
        <Text size="sm">{behaviorSummary(b)}</Text>
        {b.rating !== 'NO_HISTORY' && (
          <SimpleGrid cols={3} spacing="xs">
            <Stat label="A tiempo" value={`${b.onTimePercent} %`} />
            <Stat label="Atrasadas" value={String(b.late)} />
            <Stat label="Mayor atraso" value={`${b.maxDaysLate} d`} />
          </SimpleGrid>
        )}
        {b.overdueNow > 0 && (
          <Text size="sm" c="red">
            Hoy tiene {b.overdueNow} cuota{b.overdueNow === 1 ? '' : 's'} vencida
            {b.overdueNow === 1 ? '' : 's'} sin cobrar.
          </Text>
        )}
      </Stack>
    </Foldable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Group gap={2} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700}>{value}</Text>
    </Group>
  );
}
