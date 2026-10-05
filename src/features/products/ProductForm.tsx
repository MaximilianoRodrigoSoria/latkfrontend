import {
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  TagsInput,
  Text,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import dayjs from 'dayjs';
import type { PaymentFrequency, ProductRequest } from '../../api/types';

interface FormValues {
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
  return {
    name: values.name.trim(),
    frequency: values.frequency,
    ratePerPeriod: Number(values.ratePercent) / 100,
    allowedAmounts: toNumbers(values.allowedAmounts),
    allowedInstallments: toNumbers(values.allowedInstallments).map(Math.trunc),
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
      allowedAmounts: (v) =>
        toNumbers(v).length && toNumbers(v).every((n) => n > 0) ? null : 'Montos mayores a cero',
      allowedInstallments: (v) =>
        toNumbers(v).length && toNumbers(v).every((n) => n >= 4 && n <= 16)
          ? null
          : 'Entre 4 y 16 cuotas',
    },
  });

  const period = form.values.frequency === 'WEEKLY' ? 'semanal' : 'mensual';

  return (
    <form onSubmit={form.onSubmit((values) => onSubmit(toProductRequest(values)))}>
      <Stack>
        <TextInput label="Nombre" placeholder="Semanal 12" {...form.getInputProps('name')} />
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
          label={`Tasa ${period} (%)`}
          description="Se aplica por periodo con sistema frances"
          decimalScale={4}
          min={0}
          max={99.99}
          suffix=" %"
          {...form.getInputProps('ratePercent')}
        />
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
