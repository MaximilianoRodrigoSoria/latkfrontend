import dayjs from 'dayjs';
import type { PaymentFrequency } from '../api/types';

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const moneyShort = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export const formatMoney = (value: number) => money.format(value);
export const formatMoneyShort = (value: number) => moneyShort.format(value);

/** 0.01 -> "1 %" ; 0.0125 -> "1,25 %" */
export function formatRate(rate: number): string {
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 4 }).format(rate * 100)} %`;
}

export const formatDate = (iso: string) => dayjs(iso).format('DD/MM/YYYY');
export const formatDateTime = (iso: string) => dayjs(iso).format('DD/MM/YYYY HH:mm');

export const FREQUENCY_LABEL: Record<PaymentFrequency, string> = {
  DAILY: 'Diario',
  WEEKLY: 'Semanal',
  EVERY_10_DAYS: 'Cada 10 días',
  EVERY_14_DAYS: 'Catorcenal',
  BIWEEKLY: 'Quincenal',
  EVERY_20_DAYS: 'Cada 20 días',
  EVERY_28_DAYS: 'Cada 28 días',
  MONTHLY: 'Mensual',
};

export const PERIOD_LABEL: Record<PaymentFrequency, string> = {
  DAILY: 'diaria',
  WEEKLY: 'semanal',
  EVERY_10_DAYS: 'cada 10 días',
  EVERY_14_DAYS: 'catorcenal',
  BIWEEKLY: 'quincenal',
  EVERY_20_DAYS: 'cada 20 días',
  EVERY_28_DAYS: 'cada 28 días',
  MONTHLY: 'mensual',
};

/** Para "N cuotas ...": "8 cuotas semanales", "38 cuotas diarias", "6 cuotas cada 10 días". */
export const INSTALLMENTS_LABEL: Record<PaymentFrequency, string> = {
  DAILY: 'diarias',
  WEEKLY: 'semanales',
  EVERY_10_DAYS: 'cada 10 días',
  EVERY_14_DAYS: 'catorcenales',
  BIWEEKLY: 'quincenales',
  EVERY_20_DAYS: 'cada 20 días',
  EVERY_28_DAYS: 'cada 28 días',
  MONTHLY: 'mensuales',
};

/** En el orden en que se ofrecen, de la mas corta a la mas larga. */
export const FREQUENCIES = Object.keys(FREQUENCY_LABEL) as PaymentFrequency[];
