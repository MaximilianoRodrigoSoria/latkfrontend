import {
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import dayjs from 'dayjs';
import type { PaymentFrequency, ProductRequest, ProductTier } from '../../api/types';

/** Las categorias en orden, con su nombre visible. */
export const TIERS: { value: ProductTier; label: string }[] = [
  { value: 'IRON', label: 'Hierro' },
  { value: 'BRONZE', label: 'Bronce' },
  { value: 'SILVER', label: 'Plata' },
  { value: 'GOLD', label: 'Oro' },
  { value: 'PLATINUM', label: 'Platino' },
  { value: 'EMERALD', label: 'Esmeralda' },
  { value: 'DIAMOND', label: 'Diamante' },
];

/** Paso de los montos de una categoria. */
export const AMOUNT_STEP = 5000;

/** Valores de {@code step} en {@code step} entre min y max, ambos incluidos. */
export function range(min: number, max: number, step: number): number[] {
  const values: number[] = [];
  for (let v = min; v <= max; v += step) values.push(v);
  return values;
}

interface FormValues {
  /** '' = producto sin categoria (montos sueltos y tasa unica). */
  tier: ProductTier | '';
  sellerVisible: boolean;
  minAmount: number | string;
  maxAmount: number | string;
  minInstallments: number | string;
  maxInstallments: number | string;
  name: string;
  frequency: PaymentFrequency;
  ratePercent: number | string;
  allowedAmounts: string[];
  allowedInstallments: string[];
  graceDays: number | string;
  lateFeePercent: number | string;
  installmentsToDefault: number | string;
  validity: [string | null, string | null];
}

const toNumbers = (values: string[]) =>
  values
    .map((v) => Number(v.replace(/\./g, '').replace(',', '.')))
    .filter((n) => Number.isFinite(n));

/** Convierte el formulario (porcentajes, listas de texto) al contrato de la API. */
export function toProductRequest(values: FormValues): ProductRequest {
  const [from, to] = values.validity;
  const tiered = values.tier !== '';
  return {
    name: values.name.trim(),
    frequency: values.frequency,
    ratePerPeriod: Number(values.ratePercent) / 100,
    allowedAmounts: tiered
      ? range(Number(values.minAmount), Number(values.maxAmount), AMOUNT_STEP)
      : toNumbers(values.allowedAmounts),
    allowedInstallments: tiered
      ? range(Number(values.minInstallments), Number(values.maxInstallments), 1)
      : toNumbers(values.allowedInstallments).map(Math.trunc),
    tier: tiered ? (values.tier as ProductTier) : null,
    sellerVisible: values.sellerVisible,
    graceDays: Number(values.graceDays),
    lateFeeRate: Number(values.lateFeePercent) / 100,
    installmentsToDefault: Number(values.installmentsToDefault),
    validFrom: from ? dayjs(from).format('YYYY-MM-DD') : null,
    validTo: to ? dayjs(to).format('YYYY-MM-DD') : null,
  };
}

interface ProductFormProps {
  submitting: boolean;
  onSubmit: (request: ProductRequest) => void;
}

export function ProductForm({ submitting, onSubmit }: ProductFormProps) {
  const form = useForm<FormValues>({
    initialValues: {
      tier: '',
      sellerVisible: true,
      minAmount: 20000,
      maxAmount: 50000,
      minInstallments: 4,
      maxInstallments: 8,
      name: '',
      frequency: 'WEEKLY',
      ratePercent: 16.3511,
      allowedAmounts: ['50000', '100000', '150000', '200000'],
      allowedInstallments: ['4', '6', '8', '12', '16'],
      graceDays: 2,
      lateFeePercent: 10,
      installmentsToDefault: 4,
      validity: [null, null],
    },
    validate: {
      name: (v) => (v.trim() ? null : 'El nombre es obligatorio'),
      ratePercent: (v) => (Number(v) >= 0 && Number(v) < 100 ? null : 'Entre 0 y 100'),
      allowedAmounts: (v, values) =>
        values.tier !== '' || (toNumbers(v).length && toNumbers(v).every((n) => n > 0))
          ? null
          : 'Montos mayores a cero',
      allowedInstallments: (v, values) =>
        values.tier !== '' || (toNumbers(v).length && toNumbers(v).every((n) => n >= 4 && n <= 16))
          ? null
          : 'Entre 4 y 16 cuotas',
      minAmount: (v, values) =>
        values.tier === '' ||
        (Number(v) > 0 && Number(v) % AMOUNT_STEP === 0 && Number(v) <= Number(values.maxAmount))
          ? null
          : 'Múltiplo de $5.000 y menor o igual al máximo',
      maxAmount: (v, values) =>
        values.tier === '' || (Number(v) > 0 && Number(v) % AMOUNT_STEP === 0)
          ? null
          : 'Múltiplo de $5.000',
      minInstallments: (v, values) =>
        values.tier === '' ||
        (Number(v) >= 4 && Number(v) <= 16 && Number(v) <= Number(values.maxInstallments))
          ? null
          : 'Entre 4 y 16, menor o igual al máximo',
      maxInstallments: (v, values) =>
        values.tier === '' || (Number(v) >= 4 && Number(v) <= 16) ? null : 'Entre 4 y 16',
    },
  });

  const period = form.values.frequency === 'WEEKLY' ? 'semanal' : 'mensual';
  const tiered = form.values.tier !== '';

  return (
    <form onSubmit={form.onSubmit((values) => onSubmit(toProductRequest(values)))}>
      <Stack>
        <Select
          label="Categoría"
          description="Con categoría: rango de montos y la tasa base por cuotas más un recargo"
          data={[{ value: '', label: 'Sin categoría (montos fijos)' }, ...TIERS]}
          allowDeselect={false}
          {...form.getInputProps('tier')}
          onChange={(value) => {
            form.setFieldValue('tier', (value ?? '') as ProductTier | '');
            const label = TIERS.find((t) => t.value === value)?.label;
            if (label && !form.values.name.trim()) form.setFieldValue('name', label);
          }}
        />
        <TextInput label="Nombre" placeholder="Bronce" {...form.getInputProps('name')} />
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Frecuencia de pago
          </Text>
          <SegmentedControl
            fullWidth
            data={[
              { value: 'WEEKLY', label: 'Semanal' },
              { value: 'MONTHLY', label: 'Mensual' },
            ]}
            {...form.getInputProps('frequency')}
          />
        </Stack>
        <NumberInput
          label={tiered ? `Recargo de la categoría (%)` : `Tasa ${period} (%)`}
          description={
            tiered
              ? 'Se suma a la tasa base por cantidad de cuotas'
              : 'Se aplica por periodo con sistema frances'
          }
          decimalScale={4}
          min={0}
          max={99.99}
          suffix=" %"
          {...form.getInputProps('ratePercent')}
        />
        {tiered ? (
          <>
            <SimpleGrid cols={2}>
              <NumberInput
                label="Monto mínimo"
                prefix="$ "
                thousandSeparator="."
                decimalSeparator=","
                step={AMOUNT_STEP}
                min={AMOUNT_STEP}
                {...form.getInputProps('minAmount')}
              />
              <NumberInput
                label="Monto máximo"
                prefix="$ "
                thousandSeparator="."
                decimalSeparator=","
                step={AMOUNT_STEP}
                min={AMOUNT_STEP}
                {...form.getInputProps('maxAmount')}
              />
              <NumberInput
                label="Cuotas mínimas"
                min={4}
                max={16}
                {...form.getInputProps('minInstallments')}
              />
              <NumberInput
                label="Cuotas máximas"
                min={4}
                max={16}
                {...form.getInputProps('maxInstallments')}
              />
            </SimpleGrid>
            <Text size="xs" c="dimmed">
              Los montos van de $5.000 en $5.000 entre el mínimo y el máximo.
            </Text>
            <Switch
              label="Visible para vendedores"
              description="Apagado: la categoría existe pero los vendedores no la ven"
              {...form.getInputProps('sellerVisible', { type: 'checkbox' })}
            />
          </>
        ) : (
          <>
            <TagsInput
              label="Montos permitidos"
              description="Escribi un monto y presiona Enter"
              {...form.getInputProps('allowedAmounts')}
            />
            <TagsInput
              label="Cantidades de cuotas"
              description="Entre 4 y 16 cuotas"
              {...form.getInputProps('allowedInstallments')}
            />
          </>
        )}
        <SimpleGrid cols={{ base: 1, xs: 3 }}>
          <NumberInput
            label="Dias de gracia"
            min={0}
            max={60}
            {...form.getInputProps('graceDays')}
          />
          <NumberInput
            label="Recargo por mora (%)"
            min={0}
            max={99.99}
            decimalScale={2}
            {...form.getInputProps('lateFeePercent')}
          />
          <NumberInput
            label="Cuotas para perdida"
            min={1}
            {...form.getInputProps('installmentsToDefault')}
          />
        </SimpleGrid>
        <DatePickerInput
          type="range"
          label="Vigencia (opcional)"
          placeholder="Sin limite"
          clearable
          valueFormat="DD/MM/YYYY"
          {...form.getInputProps('validity')}
        />
        <Group justify="flex-end">
          <Button type="submit" loading={submitting} fullWidth>
            Crear producto
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
