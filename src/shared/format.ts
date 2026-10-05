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

export const FREQUENCY_LABEL: Record<PaymentFrequency, string> = {
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
};

export const PERIOD_LABEL: Record<PaymentFrequency, string> = {
  WEEKLY: 'semanal',
  MONTHLY: 'mensual',
};
