import type { InstallmentResponse, LoanResponse } from '../../api/types';
import { formatDateTime, formatMoney } from '../../shared/format';

/** Numero de recibo estable: primeros 8 del prestamo + cuota ("R-3A1F09C2-04"). */
export function receiptNumber(loanId: string, installment: number): string {
  return `R-${loanId.replace(/-/g, '').slice(0, 8).toUpperCase()}-${String(installment).padStart(2, '0')}`;
}

/**
 * Saldo al momento de cobrar esa cuota: las cuotas posteriores (se cobran en orden). Asi el recibo
 * de una cuota vieja muestra el saldo de ese dia, no el de hoy.
 */
export function remainingAfter(
  loan: LoanResponse,
  installment: number,
): { amount: number; installments: number } {
  const pending = (loan.schedule ?? []).filter((r) => r.number > installment);
  return {
    amount: Math.round(pending.reduce((sum, r) => sum + r.amount, 0) * 100) / 100,
    installments: pending.length,
  };
}

const UNITS = [
  '',
  'un',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiún',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
];
const TENS = [
  '',
  '',
  '',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
];
const HUNDREDS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
];

function belowThousand(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(HUNDREDS[h]!);
  if (rest < 30) {
    if (rest) parts.push(UNITS[rest]!);
  } else {
    const t = Math.floor(rest / 10);
    const u = rest % 10;
    parts.push(u ? `${TENS[t]} y ${UNITS[u]}` : TENS[t]!);
  }
  return parts.join(' ');
}

/** Entero en letras ("veintitrés mil setecientos setenta"), hasta 999.999.999. */
export function integerInWords(n: number): string {
  if (n === 0) return 'cero';
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions) parts.push(millions === 1 ? 'un millón' : `${belowThousand(millions)} millones`);
  if (thousands) parts.push(thousands === 1 ? 'mil' : `${belowThousand(thousands)} mil`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(' ');
}

/** Monto en letras como en un recibo: "Pesos veintitrés mil setecientos setenta con 00/100". */
export function amountInWords(amount: number): string {
  const pesos = Math.floor(amount);
  const cents = Math.round((amount - pesos) * 100);
  const words = integerInWords(pesos);
  return `Pesos ${words} con ${String(cents).padStart(2, '0')}/100`;
}

export interface ReceiptData {
  number: string;
  collectedAt: string | null;
  customerName: string;
  customerDni: string | null;
  amount: number;
  amountInWords: string;
  installment: number;
  installments: number;
  product: string;
  loanRef: string;
  collector: string;
  remaining: { amount: number; installments: number };
}

export function receiptData(loan: LoanResponse, row: InstallmentResponse): ReceiptData {
  return {
    number: receiptNumber(loan.id, row.number),
    collectedAt: row.collectedAt ?? null,
    customerName: loan.customerName,
    customerDni: loan.customerDni,
    amount: row.amount,
    amountInWords: amountInWords(row.amount),
    installment: row.number,
    installments: loan.installments,
    product: loan.productName,
    loanRef: loan.id.slice(0, 8).toUpperCase(),
    collector: row.collectedByName ?? loan.sellerName,
    remaining: remainingAfter(loan, row.number),
  };
}

/** Texto para mandar por WhatsApp (u otra app) como comprobante. */
export function receiptMessage(r: ReceiptData): string {
  const lines = [
    `*L.A TK · Recibo de pago ${r.number}*`,
    '',
    `Recibimos de ${r.customerName}${r.customerDni ? ` (DNI ${r.customerDni})` : ''} la suma de *${formatMoney(r.amount)}*`,
    `(${r.amountInWords})`,
    `en concepto de la cuota ${r.installment} de ${r.installments} del préstamo ${r.product} Nº ${r.loanRef}.`,
    '',
    r.collectedAt ? `Fecha de cobro: ${formatDateTime(r.collectedAt)}` : '',
    `Cobró: ${r.collector}`,
    r.remaining.installments > 0
      ? `Saldo pendiente: ${formatMoney(r.remaining.amount)} (${r.remaining.installments} cuota${r.remaining.installments === 1 ? '' : 's'})`
      : '¡Préstamo cancelado! No quedan cuotas pendientes.',
    '',
    'Gracias por tu pago. Guardá este comprobante.',
  ];
  return lines.filter((l, i, all) => l !== '' || all[i - 1] !== '').join('\n');
}
