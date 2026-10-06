import type { SimulationResponse } from '../../api/types';
import { formatDate, formatMoneyShort, INSTALLMENTS_LABEL } from '../format';

/**
 * Textos para compartir con el cliente por WhatsApp: monto, cuotas y total a devolver, con un tono
 * cercano. Nunca la tasa, la ganancia ni el porcentaje del vendedor.
 */
export function simulationMessage(result: SimulationResponse): string {
  const period = INSTALLMENTS_LABEL[result.frequency];
  const cuotas = result.schedule.map(
    (row) => `• Cuota ${row.number} · ${formatDate(row.dueDate)} · ${formatMoneyShort(row.amount)}`,
  );
  return [
    '¡Hola! 👋 Te paso la propuesta de tu préstamo:',
    '',
    `💵 Te prestamos: *${formatMoneyShort(result.principal)}*`,
    `📅 ${result.installments} cuotas ${period} de *${formatMoneyShort(result.installmentAmount)}*`,
    `🧾 Total a devolver: ${formatMoneyShort(result.totalToRepay)}`,
    '',
    'Así quedan las cuotas:',
    ...cuotas,
    '',
    'Si te sirve, avisame y lo dejamos listo. ¡Gracias por confiar en nosotros! 😊',
  ].join('\n');
}
