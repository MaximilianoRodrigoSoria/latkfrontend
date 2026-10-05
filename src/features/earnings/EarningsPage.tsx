import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronRight, IconEye, IconEyeOff, IconLock } from '@tabler/icons-react';
import { Link } from 'react-router';
import type { EarningsResponse } from '../../api/types';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatMoney, formatMoneyShort } from '../../shared/format';
import { RevealEarningsModal } from '../products/RevealEarningsModal';
import { STATUS_COLOR, STATUS_LABEL } from '../loans/loanDraft';
import { useMyEarnings } from './useMyEarnings';

/** "2026-10" -> "octubre 2026" */
export function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })
    .format(new Date(year!, month! - 1, 1))
    .replace(' de ', ' ');
}

/**
 * Ganancias del vendedor: por cada cuota cobrada gana un monto fijo (cuota x su %, que nunca se
 * muestra). Se revela con la contrasena y se oculta sola, igual que en Productos.
 */
export function EarningsPage() {
  const { earnings, reveal, hide } = useMyEarnings();
  const [opened, modal] = useDisclosure(false);

  return (
    <Stack>
      <PageHeader
        title="Mis ganancias"
        description="Ganás un monto fijo por cada cuota que cobrás"
        action={
          earnings ? (
            <ActionIcon variant="light" size="lg" onClick={hide} aria-label="Ocultar">
              <IconEyeOff size={20} />
            </ActionIcon>
          ) : undefined
        }
      />

      {!earnings && (
        <Card withBorder padding="xl">
          <Stack align="center" gap="sm" ta="center">
            <ThemeIcon size={56} radius="xl" variant="light">
              <IconLock size={28} />
            </ThemeIcon>
            <Text fw={700}>Tus ganancias están ocultas</Text>
            <Text size="sm" c="dimmed" maw={320}>
              Confirmá tu contraseña para ver cuánto ganaste este mes, cuánto te falta cobrar y el
              detalle por préstamo.
            </Text>
            <Button leftSection={<IconEye size={18} />} onClick={modal.open}>
              Ver mis ganancias
            </Button>
          </Stack>
        </Card>
      )}

      {earnings && <EarningsView data={earnings} />}

      <RevealEarningsModal
        opened={opened && !earnings}
        loading={reveal.isPending}
        error={reveal.isError ? reveal.error.message : null}
        onClose={() => {
          reveal.reset();
          modal.close();
        }}
        onConfirm={(password) => reveal.mutate(password, { onSuccess: modal.close })}
      />
    </Stack>
  );
}

function EarningsView({ data }: { data: EarningsResponse }) {
  const monthTotal = data.earnedThisMonth + data.expectedThisMonth;
  const maxMonth = Math.max(1, ...data.months.map((m) => m.earned + m.expected));

  return (
    <>
      <Card withBorder padding="lg">
        <Stack gap="xs">
          <Text size="sm" c="dimmed" tt="capitalize">
            {monthLabel(data.currentMonth)}
          </Text>
          <Group gap={8} align="baseline">
            <Text size="sm">Ganaste</Text>
            <Text fw={800} fz={32} c="teal" lh={1.1}>
              {formatMoney(data.earnedThisMonth)}
            </Text>
          </Group>
          <Progress
            value={monthTotal ? (data.earnedThisMonth / monthTotal) * 100 : 0}
            color="teal"
            size="lg"
            aria-label="Ganado sobre lo posible del mes"
          />
          <Text size="sm" c="dimmed">
            {data.expectedThisMonth > 0
              ? `Te faltan cobrar ${formatMoney(data.expectedThisMonth)} este mes`
              : 'No te quedan cuotas por cobrar este mes'}
          </Text>
        </Stack>
      </Card>

      <SimpleGrid cols={2}>
        <Stat label="Ganado en total" value={data.earnedTotal} color="teal" />
        <Stat label="Por cobrar" value={data.pendingTotal} />
      </SimpleGrid>

      {data.months.length > 0 && (
        <Card withBorder padding="md">
          <Text fw={700} mb="xs">
            Por mes
          </Text>
          <Stack gap="sm">
            {data.months.map((m) => (
              <Stack key={m.month} gap={4}>
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" tt="capitalize" fw={m.month === data.currentMonth ? 700 : 500}>
                    {monthLabel(m.month)}
                  </Text>
                  <Text size="sm">
                    <Text span fw={700} c="teal">
                      {formatMoney(m.earned)}
                    </Text>
                    {m.expected > 0 && (
                      <Text span c="dimmed">
                        {' '}
                        + {formatMoney(m.expected)}
                      </Text>
                    )}
                  </Text>
                </Group>
                <Progress.Root size="md">
                  <Progress.Section value={(m.earned / maxMonth) * 100} color="teal" />
                  <Progress.Section value={(m.expected / maxMonth) * 100} color="gray.4" />
                </Progress.Root>
              </Stack>
            ))}
          </Stack>
          <Group gap="md" mt="sm">
            <Legend color="teal" label="Cobrado" />
            <Legend color="gray.4" label="Por cobrar" />
          </Group>
        </Card>
      )}

      <Text fw={700} mt="xs">
        Por préstamo
      </Text>
      {data.loans.length === 0 && (
        <Text size="sm" c="dimmed">
          Todavía no tenés préstamos con cuotas. Cuando el administrador transfiera uno, acá ves lo
          que te deja cada cuota.
        </Text>
      )}
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {data.loans.map((l) => (
          <Card key={l.loanId} withBorder padding="md" component={Link} to={`/loans/${l.loanId}`}>
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Stack gap={4} style={{ flex: 1 }}>
                <Group gap="xs">
                  <Text fw={700}>{l.customerName}</Text>
                  <Badge size="xs" variant="light" color={STATUS_COLOR[l.status]}>
                    {STATUS_LABEL[l.status]}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Prestaste {formatMoneyShort(l.principal)} · {l.installmentsCollected}/
                  {l.installments} cuotas · {formatMoney(l.perInstallment)} por cuota
                </Text>
                <Progress
                  value={(l.installmentsCollected / l.installments) * 100}
                  color="teal"
                  size="sm"
                  aria-label={`Cuotas cobradas de ${l.customerName}`}
                />
                <Group justify="space-between">
                  <Text size="sm">
                    Ganado{' '}
                    <Text span fw={700} c="teal">
                      {formatMoney(l.earned)}
                    </Text>
                  </Text>
                  <Text size="sm" c="dimmed">
                    Falta {formatMoney(l.pending)}
                  </Text>
                </Group>
              </Stack>
              <IconChevronRight size={20} color="var(--mantine-color-dimmed)" />
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card withBorder padding="md">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={800} size="lg" c={color}>
        {formatMoney(value)}
      </Text>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Group gap={6}>
      <Badge size="xs" circle color={color}>
        {' '}
      </Badge>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
  );
}
