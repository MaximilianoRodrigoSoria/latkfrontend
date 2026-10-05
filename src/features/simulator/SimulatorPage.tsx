import { Button, Card, Group, Paper, Select, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { DateInput } from '@mantine/dates';
import { IconCalculator } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { SimulationResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { isSeller } from '../../auth/permissions';
import { PageHeader } from '../../shared/components/PageHeader';
import {
  formatDate,
  formatMoney,
  formatMoneyShort,
  formatRate,
  PERIOD_LABEL,
} from '../../shared/format';
import { notifyError } from '../../shared/notify';
import { ShareButton } from '../../shared/share/ShareButton';
import { simulationMessage } from '../../shared/share/shareMessages';

export function SimulatorPage() {
  const products = useQuery({
    queryKey: queryKeys.products(true),
    queryFn: () => api.products(true),
  });
  const [productId, setProductId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [installments, setInstallments] = useState<string | null>(null);
  const [firstDueDate, setFirstDueDate] = useState<string | null>(null);

  const product = products.data?.find((p) => p.id === productId);

  const simulate = useMutation({ mutationFn: api.simulate, onError: (e) => notifyError(e) });

  const selectProduct = (id: string | null) => {
    const selected = products.data?.find((p) => p.id === id);
    setProductId(id);
    setAmount(selected ? String(selected.allowedAmounts[0]) : null);
    setInstallments(selected ? String(selected.allowedInstallments[0]) : null);
    simulate.reset();
  };

  const canSimulate = !!productId && !!amount && !!installments;

  return (
    <Stack>
      <PageHeader title="Simulador" description="Plan de cuotas con sistema frances" />
      <Paper withBorder p="md">
        <Stack>
          <Select
            label="Producto"
            placeholder={products.isLoading ? 'Cargando...' : 'Elegi un producto'}
            data={(products.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
            value={productId}
            onChange={selectProduct}
            nothingFoundMessage="No hay productos disponibles"
          />
          {product && (
            <Text size="sm" c="dimmed">
              Tasa {formatRate(product.ratePerPeriod)} {PERIOD_LABEL[product.frequency]}
            </Text>
          )}
          <SimpleGrid cols={{ base: 2 }}>
            <Select
              label="Monto"
              disabled={!product}
              data={(product?.allowedAmounts ?? []).map((a) => ({
                value: String(a),
                label: formatMoneyShort(a),
              }))}
              value={amount}
              onChange={setAmount}
            />
            <Select
              label="Cuotas"
              disabled={!product}
              data={(product?.allowedInstallments ?? []).map((n) => ({
                value: String(n),
                label: `${n} cuotas`,
              }))}
              value={installments}
              onChange={setInstallments}
            />
          </SimpleGrid>
          <DateInput
            label="Primer vencimiento (opcional)"
            placeholder="Un periodo desde hoy"
            valueFormat="DD/MM/YYYY"
            minDate={dayjs().format('YYYY-MM-DD')}
            clearable
            value={firstDueDate}
            onChange={setFirstDueDate}
          />
          <Button
            leftSection={<IconCalculator size={18} />}
            disabled={!canSimulate}
            loading={simulate.isPending}
            onClick={() =>
              simulate.mutate({
                productId: productId!,
                amount: Number(amount),
                installments: Number(installments),
                firstDueDate: firstDueDate ? dayjs(firstDueDate).format('YYYY-MM-DD') : null,
              })
            }
          >
            Calcular
          </Button>
        </Stack>
      </Paper>
      {simulate.data && <SimulationResult result={simulate.data} />}
    </Stack>
  );
}

function SimulationResult({ result }: { result: SimulationResponse }) {
  // El grafico de capital e interes es para el admin; el vendedor ve solo cuotas y totales.
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
        <Stat label="Interes total" value={formatMoney(result.totalInterest)} />
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
              <Table.Th ta="right">Capital</Table.Th>
              <Table.Th ta="right">Interes</Table.Th>
              <Table.Th ta="right">Saldo</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {result.schedule.map((row) => (
              <Table.Tr key={row.number}>
                <Table.Td>{row.number}</Table.Td>
                <Table.Td>{formatDate(row.dueDate)}</Table.Td>
                <Table.Td ta="right">{formatMoney(row.amount)}</Table.Td>
                <Table.Td ta="right">{formatMoney(row.principal)}</Table.Td>
                <Table.Td ta="right">{formatMoney(row.interest)}</Table.Td>
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
