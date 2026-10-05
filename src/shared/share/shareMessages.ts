import type { OfferOption, PaymentFrequency, SimulationResponse } from '../../api/types';
import { formatDate, formatMoneyShort, PERIOD_LABEL } from '../format';

/**
 * Textos para compartir con el cliente: SOLO la lista de cuotas. Nunca la ganancia ni el
 * porcentaje del vendedor.
 */
export function simulationMessage(result: SimulationResponse): string {
  return result.schedule
    .map(
      (row) => `Cuota ${row.number} · ${formatDate(row.dueDate)} · ${formatMoneyShort(row.amount)}`,
    )
    .join('\n');
}

export function offerMessage(
  frequency: PaymentFrequency,
  options: Pick<OfferOption, 'installments' | 'installmentAmount'>[],
): string {
  return [...options]
    .sort((a, b) => a.installments - b.installments)
    .map(
      (o) =>
        `${o.installments} cuotas ${PERIOD_LABEL[frequency]}es de ${formatMoneyShort(o.installmentAmount)}`,
    )
    .join('\n');
}
