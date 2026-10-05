import { Badge, Card, Group, Table, Text } from '@mantine/core';
import type { OfferOption, PaymentFrequency } from '../../api/types';
import { FREQUENCY_LABEL, formatMoney, formatMoneyShort } from '../../shared/format';
import { ShareButton } from '../../shared/share/ShareButton';
import { offerMessage } from '../../shared/share/shareMessages';

interface LoanAmountCardProps {
  frequency: PaymentFrequency;
  amount: number;
  /** Opciones de cuotas para este monto (sin comision). */
  options: OfferOption[];
  /** Mismas opciones con la ganancia, si el vendedor la revelo. */
  earnings?: OfferOption[];
}

/**
 * Una tarjeta por monto con una tabla: cuotas, valor de la cuota y, si el vendedor la revelo, su
 * ganancia por cuota y en todo el prestamo.
 */
export function LoanAmountCard({ frequency, amount, options, earnings }: LoanAmountCardProps) {
  const earningByInstallments = new Map(earnings?.map((o) => [o.installments, o]));
  const showEarnings = !!earnings?.length;
  const rows = [...options].sort((a, b) => a.installments - b.installments);

  return (
    <Card withBorder padding="sm">
      <Group justify="space-between" wrap="nowrap" mb="xs" px={4}>
        <Group gap={6} align="baseline" wrap="nowrap">
          <Text size="sm" c="dimmed">
            Prestas
          </Text>
          <Text fw={800} size="xl">
            {formatMoneyShort(amount)}
          </Text>
        </Group>
        <Group gap={4} wrap="nowrap">
          <Badge variant="light">{FREQUENCY_LABEL[frequency]}</Badge>
          {/* Se comparten solo los valores del cliente: nunca la ganancia. */}
          <ShareButton
            labeled={false}
            title={`Préstamo de ${formatMoneyShort(amount)}`}
            text={() => offerMessage(frequency, options)}
          />
        </Group>
      </Group>

      <Table
        fz="sm"
        verticalSpacing={6}
        horizontalSpacing={6}
        withRowBorders
        aria-label={`Cuotas para ${formatMoneyShort(amount)}`}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Cuotas</Table.Th>
            <Table.Th ta="right">Valor cuota</Table.Th>
            {showEarnings && (
              <>
                <Table.Th ta="right" c="teal">
                  Ganas x cuota
                </Table.Th>
                <Table.Th ta="right" c="teal">
                  Ganas total
                </Table.Th>
              </>
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((option) => {
            const earning = earningByInstallments.get(option.installments);
            return (
              <Table.Tr key={option.installments}>
                <Table.Td fw={600}>{option.installments}</Table.Td>
                <Table.Td ta="right" fw={800} c="brand">
                  {/* Las cuotas son multiplos de $10: sin centavos. */}
                  {formatMoneyShort(option.installmentAmount)}
                </Table.Td>
                {showEarnings && (
                  <>
                    <Table.Td ta="right" c="teal" fw={600}>
                      {earning?.commissionPerInstallment !== undefined
                        ? formatMoney(earning.commissionPerInstallment)
                        : '-'}
                    </Table.Td>
                    <Table.Td ta="right" c="teal" fw={600}>
                      {earning ? formatMoney(totalOf(earning)) : '-'}
                    </Table.Td>
                  </>
                )}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Card>
  );
}

/**
 * Total del prestamo. Si el backend no lo informa (version anterior) se calcula aca: todas las
 * cuotas son iguales, asi que es comision por cuota x cantidad de cuotas.
 */
function totalOf(option: OfferOption): number {
  if (option.totalCommission !== undefined) return option.totalCommission;
  return Math.round((option.commissionPerInstallment ?? 0) * option.installments * 100) / 100;
}
