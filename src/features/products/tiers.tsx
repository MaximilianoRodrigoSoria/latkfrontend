import { IconBox } from '@tabler/icons-react';
import type { OfferOption, ProductOffer, ProductTier } from '../../api/types';

/** Color de cada categoria (metal o piedra), en el orden en que se muestran. */
export const TIER_COLOR: Record<ProductTier, string> = {
  IRON: '#7b7f86',
  BRONZE: '#b0703c',
  SILVER: '#94a3b8',
  GOLD: '#d4a017',
  PLATINUM: '#2bb3a3',
  EMERALD: '#18a058',
  DIAMOND: '#5b7cfa',
};

/** Escudo de la categoria; sin categoria, un icono generico de producto. */
export function TierIcon({ tier, size = 26 }: { tier?: ProductTier; size?: number }) {
  if (!tier) return <IconBox size={size} stroke={1.6} aria-hidden />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill={TIER_COLOR[tier]} />
      <path
        d="M12 7l1.5 3 3.3.4-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.4z"
        fill="#fff"
        opacity={0.85}
      />
    </svg>
  );
}

/** Nombre visible: la categoria ("Oro") o el nombre del producto. */
export const offerLabel = (offer: ProductOffer) => offer.tierLabel ?? offer.productName;

/** Montos habilitados del producto, de menor a mayor. */
export function offerAmounts(offer: ProductOffer | undefined): number[] {
  if (!offer) return [];
  return [...new Set(offer.options.map((o) => o.amount))].sort((a, b) => a - b);
}

/** Cuotas habilitadas para un monto, de menor a mayor. */
export function offerInstallments(
  offer: ProductOffer | undefined,
  amount?: number | null,
): number[] {
  if (!offer) return [];
  return [
    ...new Set(
      offer.options.filter((o) => amount == null || o.amount === amount).map((o) => o.installments),
    ),
  ].sort((a, b) => a - b);
}

export function findOption(
  offer: ProductOffer | undefined,
  amount: number | null,
  installments: number | null,
): OfferOption | undefined {
  return offer?.options.find((o) => o.amount === amount && o.installments === installments);
}

/** Rango de tasas de la categoria (admin): "16 % a 17,5 %". */
export function rateRange(offer: ProductOffer): [number, number] | null {
  const rates = offer.options.map((o) => o.ratePerPeriod).filter((r): r is number => r != null);
  if (rates.length === 0) return null;
  return [Math.min(...rates), Math.max(...rates)];
}
