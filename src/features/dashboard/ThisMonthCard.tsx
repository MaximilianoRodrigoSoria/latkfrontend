import {
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCalendarDollar,
  IconCash,
  IconEye,
  IconEyeOff,
  IconReceipt,
  IconSparkles,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { PortfolioStats } from '../../api/types';
import { formatMoney, formatMoneyShort } from '../../shared/format';
import { useMyEarnings } from '../earnings/useMyEarnings';
import { RevealEarningsModal } from '../products/RevealEarningsModal';
import { monthName } from '../quota/QuotaCard';

const HIDDEN = '$ ••••••';

/** Las tres cifras del mes del vendedor, separadas. */
export interface MonthFigures {
  /** Ganancia si cobra todas las cuotas que vencen en el mes (ya ganado + lo que falta). */
  canEarn: number;
  /** Ganancia de las cuotas ya cobradas en el mes. */
  earned: number;
  /** Lo que pagaron los clientes en el mes. */
  collected: number;
  /** Lo que tiene que rendir al administrador: lo cobrado menos su ganancia. */
  toSettle: number;
}

export function monthFigures(
  collected: number,
  earnings: { earnedThisMonth: number; expectedThisMonth: number },
): MonthFigures {
  const earned = earnings.earnedThisMonth;
  return {
    canEarn: earned + earnings.expectedThisMonth,
    earned,
    collected,
    toSettle: Math.max(0, collected - earned),
  };
}

/**
 * "Este mes" en Inicio. Para el vendedor separa tres cosas: cuanto puede ganar (lo destacado),
 * cuanto pagaron sus clientes y cuanto tiene que rendir. La ganancia y lo que se rinde (que la
 * delata) se revelan con la contrasena y se ocultan solas, igual que en Ganancias.
 */
export function ThisMonthCard({ stats, seller }: { stats: PortfolioStats; seller: boolean }) {
  const month = monthName(stats.today.slice(0, 7));
  const collected = stats.collectedThisMonth.amount;
  const monthTotal = collected + stats.dueThisMonth.amount;
  const collectedPercent = monthTotal ? (collected / monthTotal) * 100 : 0;
  const { earnings, reveal, hide } = useMyEarnings();
  const [opened, modal] = useDisclosure(false);
  const figures = earnings ? monthFigures(collected, earnings) : null;

  return (
    <Card withBorder padding="lg" radius="lg">
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Group gap={8} wrap="nowrap">
          <ThemeIcon variant="light" color="teal" radius="xl">
            <IconCalendarDollar size={18} />
          </ThemeIcon>
          <Text fw={800} size="lg">
            Este mes · <span style={{ textTransform: 'capitalize' }}>{month}</span>
          </Text>
        </Group>
        {seller && figures && (
          <ActionIcon variant="subtle" onClick={hide} aria-label="Ocultar ganancia">
            <IconEyeOff size={18} />
          </ActionIcon>
        )}
      </Group>

      <Stack gap="md">
        {seller && <EarningsHero month={month} figures={figures} onReveal={modal.open} />}

        <SimpleGrid cols={seller ? 2 : 1} spacing="sm">
          <Figure
            icon={<IconCash size={16} />}
            label={seller ? 'Te pagaron' : 'Cobrado este mes'}
            value={formatMoneyShort(collected)}
            color="blue"
            hint={`de ${formatMoneyShort(monthTotal)} que vence en el mes`}
          >
            <Progress
              value={collectedPercent}
              color="blue"
              size="sm"
              radius="xl"
              mt={6}
              aria-label="Cobrado del mes"
            />
          </Figure>
          {seller && (
            <Figure
              icon={<IconReceipt size={16} />}
              label="A rendir"
              value={figures ? formatMoneyShort(figures.toSettle) : HIDDEN}
              color="orange"
              hint="Lo cobrado menos tu ganancia"
            />
          )}
        </SimpleGrid>

        <Text size="sm">
          Vencen en los próximos 7 días: <b>{stats.dueNext7Days.installments}</b> cuotas ·{' '}
          <b>{formatMoneyShort(stats.dueNext7Days.amount)}</b>
        </Text>
      </Stack>

      {seller && (
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
      )}
    </Card>
  );
}

/** Lo que va a ganar el vendedor si cobra todo: la cifra protagonista de Inicio. */
function EarningsHero({
  month,
  figures,
  onReveal,
}: {
  month: string;
  figures: MonthFigures | null;
  onReveal: () => void;
}) {
  const pending = figures ? figures.canEarn - figures.earned : 0;

  return (
    <Paper
      radius="lg"
      p="lg"
      c="white"
      style={{
        background:
          'linear-gradient(135deg, var(--mantine-color-teal-7), var(--mantine-color-green-6))',
      }}
    >
      <Group gap={6} wrap="nowrap">
        <IconSparkles size={18} />
        <Text fw={600}>Este mes podés ganar</Text>
      </Group>

      {figures ? (
        <Stack gap={8} mt={4}>
          <Text fw={900} fz={44} lh={1.05}>
            {formatMoney(figures.canEarn)}
          </Text>
          <Text size="sm" opacity={0.9}>
            si cobrás todas las cuotas de {month}
          </Text>
          <Progress
            value={figures.canEarn ? (figures.earned / figures.canEarn) * 100 : 0}
            color="white"
            bg="rgba(255,255,255,0.25)"
            size="lg"
            radius="xl"
            aria-label="Ganado sobre lo que podés ganar este mes"
          />
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm">
              Llevás ganado <b>{formatMoneyShort(figures.earned)}</b>
            </Text>
            <Text size="sm" opacity={0.9}>
              {pending > 0 ? `Faltan ${formatMoneyShort(pending)}` : '¡Lo ganaste todo!'}
            </Text>
          </Group>
        </Stack>
      ) : (
        <Group justify="space-between" align="center" wrap="nowrap" mt={4}>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text fw={900} fz={36} lh={1.1} aria-label="Ganancia oculta">
              {HIDDEN}
            </Text>
            <Text size="sm" opacity={0.9}>
              Tocá Ver y confirmá tu contraseña
            </Text>
          </Box>
          <Button
            variant="white"
            color="teal"
            style={{ flexShrink: 0 }}
            leftSection={<IconEye size={18} />}
            onClick={onReveal}
          >
            Ver
          </Button>
        </Group>
      )}
    </Paper>
  );
}

function Figure({
  icon,
  label,
  value,
  color,
  hint,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
  hint: string;
  children?: ReactNode;
}) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Group gap={6} wrap="nowrap">
        <ThemeIcon size="sm" variant="light" color={color} radius="xl">
          {icon}
        </ThemeIcon>
        <Text size="xs" c="dimmed" fw={600}>
          {label}
        </Text>
      </Group>
      <Text fw={800} size="xl" mt={4}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {hint}
      </Text>
      {children}
    </Paper>
  );
}
