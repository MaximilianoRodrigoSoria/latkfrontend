import { Badge, Card, Group, Progress, RingProgress, Stack, Text } from '@mantine/core';
import { IconTargetArrow } from '@tabler/icons-react';
import type { Quota } from '../../api/types';
import { formatMoneyShort } from '../../shared/format';

/** "2026-10" -> "octubre" */
export function monthName(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(new Date(y!, m! - 1, 1));
}

/** Estado del cupo en palabras y color: nunca solo color. */
export function quotaLook(q: Quota): { color: string; label: string } {
  if (q.usingExtra) return { color: 'orange', label: 'Margen extra' };
  if (q.full) return { color: 'teal', label: 'Cumplido' };
  if (q.lentPercent >= 75) return { color: 'lime', label: 'Casi completo' };
  return { color: 'brand', label: 'En curso' };
}

/**
 * Objetivo del mes del vendedor: cuanto presto de su cupo (anillo que se llena) y cuanto le
 * devolvieron de lo prestado en el mes (barra).
 */
export function QuotaCard({ quota, title }: { quota: Quota; title?: string }) {
  const look = quotaLook(quota);
  const ring = Math.min(quota.lentPercent, 100);
  const repaidPercent = quota.toRepay > 0 ? (quota.repaid / quota.toRepay) * 100 : 0;
  const month = monthName(quota.month);

  return (
    <Card withBorder padding="md">
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Group gap={6} wrap="nowrap">
          <IconTargetArrow size={20} />
          <Text fw={700}>{title ?? `Tu objetivo de ${month}`}</Text>
        </Group>
        <Badge color={look.color} variant="light">
          {look.label}
        </Badge>
      </Group>

      <Group wrap="nowrap" align="center" gap="md">
        <RingProgress
          size={112}
          thickness={11}
          roundCaps
          sections={[{ value: ring, color: look.color }]}
          label={
            <Text ta="center" fw={800} size="lg">
              {quota.lentPercent} %
            </Text>
          }
          aria-label={`Prestado ${quota.lentPercent} % del cupo`}
        />
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text size="sm" c="dimmed">
            Prestado
          </Text>
          <Text fw={800} size="xl" lh={1.1}>
            {formatMoneyShort(quota.lent)}
          </Text>
          <Text size="sm" c="dimmed">
            de {formatMoneyShort(quota.assigned)} · {quota.loans} préstamo
            {quota.loans === 1 ? '' : 's'}
          </Text>
          <Text size="sm" fw={600} c={quota.full ? look.color : undefined}>
            {quota.full
              ? quota.extraRemaining > 0
                ? `Margen extra disponible: ${formatMoneyShort(quota.extraRemaining)}`
                : 'Sin margen extra disponible'
              : `Te quedan ${formatMoneyShort(quota.remaining)}`}
          </Text>
        </Stack>
      </Group>

      <Stack gap={4} mt="md">
        <Group justify="space-between">
          <Text size="sm">Te devolvieron</Text>
          <Text size="sm" fw={600}>
            {formatMoneyShort(quota.repaid)} de {formatMoneyShort(quota.toRepay)}
          </Text>
        </Group>
        <Progress
          value={repaidPercent}
          color={quota.fullyRepaid ? 'teal' : 'blue'}
          size="lg"
          radius="xl"
          aria-label="Devuelto de lo prestado en el mes"
        />
        <Text size="xs" c="dimmed">
          {quota.fullyRepaid
            ? `¡Se cobró todo lo prestado en ${month}!`
            : 'Cuotas cobradas de los préstamos que diste este mes.'}
        </Text>
      </Stack>
    </Card>
  );
}
