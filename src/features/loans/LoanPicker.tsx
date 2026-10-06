import {
  Box,
  Card,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import type { OfferOption, ProductOffer } from '../../api/types';
import {
  formatMoneyShort,
  formatRate,
  PERIOD_LABEL,
  INSTALLMENTS_LABEL,
} from '../../shared/format';
import {
  findOption,
  offerAmounts,
  offerInstallments,
  offerLabel,
  TIER_COLOR,
  TierIcon,
} from '../products/tiers';

/** Lo que eligio el vendedor: categoria, monto y cuotas. */
export interface LoanChoice {
  productId: string | null;
  amount: number | null;
  installments: number | null;
}

export const EMPTY_CHOICE: LoanChoice = { productId: null, amount: null, installments: null };

/**
 * Al cambiar de categoria se conserva lo que siga valiendo; si no, el monto va al maximo (lo que
 * "te puedo prestar") y las cuotas al valor del medio.
 */
export function chooseProduct(offer: ProductOffer, previous: LoanChoice): LoanChoice {
  const amounts = offerAmounts(offer);
  const amount =
    previous.amount !== null && amounts.includes(previous.amount)
      ? previous.amount
      : (amounts.at(-1) ?? null);
  const installments = offerInstallments(offer, amount);
  return {
    productId: offer.productId,
    amount,
    installments:
      previous.installments !== null && installments.includes(previous.installments)
        ? previous.installments
        : (installments[Math.floor((installments.length - 1) / 2)] ?? null),
  };
}

/** El valor permitido mas cercano (para deslizadores sobre listas no contiguas). */
export function nearest(values: number[], target: number): number {
  return values.reduce((best, v) => (Math.abs(v - target) < Math.abs(best - target) ? v : best));
}

interface LoanPickerProps {
  offers: ProductOffer[];
  value: LoanChoice;
  onChange: (choice: LoanChoice) => void;
}

/**
 * Categoria + monto + cuotas con deslizadores. La cuota y el total salen de las ofertas (mismo
 * calculo y redondeo que el backend). La tasa solo aparece si la API la manda (admin).
 */
export function LoanPicker({ offers, value, onChange }: LoanPickerProps) {
  const offer = offers.find((o) => o.productId === value.productId);
  const amounts = offerAmounts(offer);
  const installments = offerInstallments(offer, value.amount);
  const option = findOption(offer, value.amount, value.installments);

  const setAmount = (raw: number) => {
    const amount = nearest(amounts, raw);
    const allowed = offerInstallments(offer, amount);
    onChange({
      ...value,
      amount,
      installments:
        value.installments !== null && allowed.includes(value.installments)
          ? value.installments
          : (allowed[0] ?? null),
    });
  };

  return (
    <Stack gap="sm">
      <ScrollArea type="never" offsetScrollbars={false}>
        <Group gap="xs" wrap="nowrap" pb={2}>
          {offers.map((o) => (
            <TierButton
              key={o.productId}
              offer={o}
              selected={o.productId === value.productId}
              onClick={() => onChange(chooseProduct(o, value))}
            />
          ))}
        </Group>
      </ScrollArea>

      {offer && amounts.length > 0 && (
        <>
          <TierInfo offer={offer} amounts={amounts} />

          <Card withBorder padding="md" radius="md">
            <Group justify="space-between" mb={4}>
              <Text fw={700} size="sm">
                Monto
              </Text>
              <Text size="xs" c="dimmed">
                máx. {formatMoneyShort(amounts.at(-1)!)}
              </Text>
            </Group>
            <Text fw={900} fz={32} lh={1.1} aria-live="polite">
              {value.amount !== null ? formatMoneyShort(value.amount) : '-'}
            </Text>
            {amounts.length > 1 ? (
              <>
                <Slider
                  mt="sm"
                  size="lg"
                  thumbSize={24}
                  min={amounts[0]}
                  max={amounts.at(-1)}
                  step={amounts[1]! - amounts[0]!}
                  value={value.amount ?? amounts[0]}
                  onChange={setAmount}
                  label={(v) => formatMoneyShort(v)}
                  thumbLabel="Monto"
                />
                <Group justify="space-between" mt={6}>
                  <Text size="xs" c="dimmed">
                    {formatMoneyShort(amounts[0]!)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {formatMoneyShort(amounts.at(-1)!)}
                  </Text>
                </Group>
              </>
            ) : null}
          </Card>

          {installments.length > 0 && (
            <Card withBorder padding="md" radius="md">
              <Group justify="space-between" mb="xs">
                <Text fw={700} size="sm">
                  Cuotas {INSTALLMENTS_LABEL[offer.frequency]}
                </Text>
                <Text size="xs" c="dimmed">
                  de {installments[0]} a {installments.at(-1)}
                </Text>
              </Group>
              {installments.length > 1 ? (
                <Slider
                  size="lg"
                  thumbSize={24}
                  min={installments[0]}
                  max={installments.at(-1)}
                  step={1}
                  value={value.installments ?? installments[0]}
                  onChange={(v) => onChange({ ...value, installments: nearest(installments, v) })}
                  marks={installments.map((n) => ({ value: n, label: String(n) }))}
                  restrictToMarks
                  label={(v) => `${v} cuotas`}
                  thumbLabel="Cuotas"
                  mb="lg"
                />
              ) : (
                <Text fw={700}>{installments[0]} cuotas</Text>
              )}
            </Card>
          )}

          {option && <ResultCard offer={offer} option={option} />}
        </>
      )}
    </Stack>
  );
}

function TierButton({
  offer,
  selected,
  onClick,
}: {
  offer: ProductOffer;
  selected: boolean;
  onClick: () => void;
}) {
  const color = offer.tier ? TIER_COLOR[offer.tier] : 'var(--mantine-color-brand-6)';
  const max = offerAmounts(offer).at(-1);
  return (
    <UnstyledButton
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Categoría ${offerLabel(offer)}`}
      style={{
        minWidth: 84,
        padding: '8px 6px',
        borderRadius: 12,
        textAlign: 'center',
        border: `1.5px solid ${selected ? color : 'var(--mantine-color-default-border)'}`,
        background: selected
          ? `color-mix(in srgb, ${color} 12%, var(--mantine-color-body))`
          : 'var(--mantine-color-body)',
        boxShadow: selected ? `0 0 0 3px color-mix(in srgb, ${color} 20%, transparent)` : 'none',
      }}
    >
      <Stack gap={2} align="center">
        <TierIcon tier={offer.tier} />
        <Text size="xs" fw={700} lineClamp={1}>
          {offerLabel(offer)}
        </Text>
        {max !== undefined && (
          <Text size="10px" c="dimmed">
            hasta {formatMoneyShort(max)}
          </Text>
        )}
        {!offer.sellerVisible && (
          <Text size="10px" c="orange" fw={700}>
            Oculta
          </Text>
        )}
      </Stack>
    </UnstyledButton>
  );
}

function TierInfo({ offer, amounts }: { offer: ProductOffer; amounts: number[] }) {
  const color = offer.tier ? TIER_COLOR[offer.tier] : 'var(--mantine-color-brand-6)';
  const installments = offerInstallments(offer);
  return (
    <Paper
      radius="md"
      p="sm"
      style={{
        background: `color-mix(in srgb, ${color} 10%, var(--mantine-color-body))`,
        border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <TierIcon tier={offer.tier} size={34} />
        <Box>
          <Text fw={800}>{offerLabel(offer)}</Text>
          <Text size="sm">
            De {formatMoneyShort(amounts[0]!)} a <b>{formatMoneyShort(amounts.at(-1)!)}</b> · de{' '}
            {installments[0]} a {installments.at(-1)} cuotas {INSTALLMENTS_LABEL[offer.frequency]}
          </Text>
          {offer.surcharge != null && (
            <Text size="xs" c="dimmed">
              Recargo de la categoría +{formatRate(offer.surcharge)} sobre la base por cuotas
            </Text>
          )}
        </Box>
      </Group>
    </Paper>
  );
}

function ResultCard({ offer, option }: { offer: ProductOffer; option: OfferOption }) {
  return (
    <Paper
      radius="lg"
      p="md"
      c="white"
      style={{
        background:
          'linear-gradient(135deg, var(--mantine-color-brand-7), var(--mantine-color-brand-5))',
      }}
    >
      <Text size="sm" opacity={0.85}>
        Cuota {PERIOD_LABEL[offer.frequency]}
      </Text>
      <Text fw={900} fz={32} lh={1.1}>
        {formatMoneyShort(option.installmentAmount)}
      </Text>
      <SimpleGrid cols={2} mt="sm" spacing="xs">
        <Box p={8} style={{ background: 'rgba(255,255,255,0.14)', borderRadius: 10 }}>
          <Text size="xs" opacity={0.85}>
            Total a devolver
          </Text>
          <Text fw={800}>{formatMoneyShort(option.totalToRepay)}</Text>
        </Box>
        <Box p={8} style={{ background: 'rgba(255,255,255,0.14)', borderRadius: 10 }}>
          <Text size="xs" opacity={0.85}>
            Prestás
          </Text>
          <Text fw={800}>{formatMoneyShort(option.amount)}</Text>
        </Box>
      </SimpleGrid>
      {/* Solo el admin recibe la tasa: el vendedor ve cuota y total. */}
      {option.ratePerPeriod != null && (
        <Text size="xs" mt="xs" opacity={0.9}>
          Tasa {formatRate(option.ratePerPeriod)} {PERIOD_LABEL[offer.frequency]}
        </Text>
      )}
    </Paper>
  );
}
