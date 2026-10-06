import {
  Button,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { DateInput } from '@mantine/dates';
import { IconListNumbers } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { SimulationResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { isSeller } from '../../auth/permissions';
import { EMPTY_CHOICE, LoanPicker, type LoanChoice } from '../loans/LoanPicker';
import { LoansSectionTabs } from '../loans/LoansSectionTabs';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatDate, formatMoney, formatMoneyShort, PERIOD_LABEL } from '../../shared/format';
import { notifyError } from '../../shared/notify';
import { ShareButton } from '../../shared/share/ShareButton';
import { simulationMessage } from '../../shared/share/shareMessages';

/**
 * Simulador: la categoria, el monto y las cuotas se eligen con los mismos deslizadores que al pedir
 * un prestamo (cuota y total al instante); el plan completo con fechas lo calcula el backend.
 */
export function SimulatorPage() {
  const offers = useQuery({ queryKey: queryKeys.offers, queryFn: api.offers });
  const [choice, setChoice] = useState<LoanChoice>(EMPTY_CHOICE);
  const [firstDueDate, setFirstDueDate] = useState<string | null>(null);

  const simulate = useMutation({ mutationFn: api.simulate, onError: (e) => notifyError(e) });

  const change = (next: LoanChoice) => {
    setChoice(next);
    simulate.reset();
  };

  const canSimulate =
    choice.productId !== null && choice.amount !== null && choice.installments !== null;

  return (
    <Stack>
      <LoansSectionTabs />
      <PageHeader title="Simulador" description="Elegí la categoría y deslizá monto y cuotas" />
      {offers.isLoading && <Skeleton h={320} />}
      {offers.data?.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          No hay productos disponibles hoy.
        </Text>
      )}
      {offers.data && offers.data.length > 0 && (
        <Paper withBorder p="md">
          <Stack>
            <LoanPicker offers={offers.data} value={choice} onChange={change} />
            <DateInput
              label="Primer vencimiento (opcional)"
              placeholder="Un periodo desde hoy"
              valueFormat="DD/MM/YYYY"
              minDate={dayjs().format('YYYY-MM-DD')}
              clearable
              value={firstDueDate}
              onChange={(v) => {
                setFirstDueDate(v);
                simulate.reset();
              }}
            />
            <Button
              leftSection={<IconListNumbers size={18} />}
              disabled={!canSimulate}
              loading={simulate.isPending}
              onClick={() =>
                simulate.mutate({
                  productId: choice.productId!,
                  amount: choice.amount!,
                  installments: choice.installments!,
                  firstDueDate: firstDueDate ? dayjs(firstDueDate).format('YYYY-MM-DD') : null,
                })
              }
            >
              Ver plan de cuotas
            </Button>
          </Stack>
        </Paper>
      )}
      {simulate.data && <SimulationResult result={simulate.data} />}
    </Stack>
  );
}

function SimulationResult({ result }: { result: SimulationResponse }) {
  // Capital, interes y tasa son para el admin; el vendedor ve monto, cuotas y totales.
  const showBreakdown = !isSeller(useAuthStore((s) => s.user));
  const chartData = useMemo(
    () =>
      result.schedule.map((row) => ({
        cuota: String(row.number),
        Capital: row.principal,
        Interes: row.interest,
      })),
    [result],
  );

  return (
    <Stack>
      <Group justify="space-between">
        <Text fw={700}>Resultado</Text>
        <ShareButton title="Simulación de préstamo" text={() => simulationMessage(result)} />
      </Group>
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Stat label="Cuota" value={formatMoney(result.installmentAmount)} highlight />
        <Stat label="Cuotas" value={`${result.installments} ${PERIOD_LABEL[result.frequency]}es`} />
        <Stat label="Total a devolver" value={formatMoney(result.totalToRepay)} />
        {showBreakdown ? (
          <Stat label="Interes total" value={formatMoney(result.totalInterest)} />
        ) : (
          <Stat label="Monto prestado" value={formatMoney(result.principal)} />
        )}
      </SimpleGrid>

      {showBreakdown && (
        <Card withBorder>
          <Text fw={600} mb="sm">
            Capital e interes por cuota
          </Text>
          <BarChart
            h={220}
            data={chartData}
            dataKey="cuota"
            type="stacked"
            series={[
              { name: 'Capital', color: 'brand.6' },
              { name: 'Interes', color: 'accent.5' },
            ]}
            valueFormatter={formatMoneyShort}
            withLegend
          />
        </Card>
      )}

      {/* Celular: tarjetas compactas. Escritorio: tabla completa. */}
      <Stack gap="xs" hiddenFrom="sm">
        {result.schedule.map((row) => (
          <Card key={row.number} withBorder padding="sm">
            <Group justify="space-between">
              <Text fw={600}>Cuota {row.number}</Text>
              <Text fw={700}>{formatMoney(row.amount)}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Vence {formatDate(row.dueDate)}
              </Text>
              <Text size="xs" c="dimmed">
                Saldo {formatMoneyShort(row.remainingBalance)}
              </Text>
            </Group>
          </Card>
        ))}
      </Stack>
      <Card withBorder visibleFrom="sm" p={0}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>Vencimiento</Table.Th>
              <Table.Th ta="right">Cuota</Table.Th>
              {showBreakdown && <Table.Th ta="right">Capital</Table.Th>}
              {showBreakdown && <Table.Th ta="right">Interes</Table.Th>}
              <Table.Th ta="right">Saldo</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {result.schedule.map((row) => (
              <Table.Tr key={row.number}>
                <Table.Td>{row.number}</Table.Td>
                <Table.Td>{formatDate(row.dueDate)}</Table.Td>
                <Table.Td ta="right">{formatMoney(row.amount)}</Table.Td>
                {showBreakdown && <Table.Td ta="right">{formatMoney(row.principal)}</Table.Td>}
                {showBreakdown && <Table.Td ta="right">{formatMoney(row.interest)}</Table.Td>}
                <Table.Td ta="right">{formatMoney(row.remainingBalance)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card withBorder padding="sm">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={800} size={highlight ? 'xl' : 'md'} c={highlight ? 'brand' : undefined}>
        {value}
      </Text>
    </Card>
  );
}
