import {
  Button,
  Group,
  NumberInput,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import type { ReactNode } from 'react';
import {
  bankFromCbu,
  formatCuil,
  onlyDigits,
  PROVINCES,
  suggestCuils,
} from '../customers/validators';
import {
  EMPTY_SELLER,
  sellerValidation,
  type SellerFormMode,
  type SellerFormValues,
} from './sellerFormModel';

interface SellerFormProps {
  mode: SellerFormMode;
  initial?: SellerFormValues;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: SellerFormValues) => void;
}

/** Formulario de vendedor. Segun el modo muestra identidad y acceso (admin) o solo lo editable. */
export function SellerForm({ mode, initial, submitting, submitLabel, onSubmit }: SellerFormProps) {
  const form = useForm<SellerFormValues>({
    initialValues: initial ?? EMPTY_SELLER,
    validate: sellerValidation(mode),
  });
  const v = form.values;
  const suggestions = v.cuil || mode === 'self' ? [] : suggestCuils(v.dni);
  const detectedBank = bankFromCbu(v.cbu);

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="lg">
        {mode !== 'self' && (
          <Section title="Datos personales">
            <SimpleGrid cols={{ base: 1, xs: 2 }}>
              <TextInput label="Nombre" autoComplete="off" {...form.getInputProps('firstName')} />
              <TextInput label="Apellido" autoComplete="off" {...form.getInputProps('lastName')} />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, xs: 2 }}>
              <TextInput
                label="DNI"
                inputMode="numeric"
                placeholder="12345678"
                {...form.getInputProps('dni')}
              />
              <TextInput
                label="CUIL"
                inputMode="numeric"
                placeholder="20-12345678-6"
                {...form.getInputProps('cuil')}
                onChange={(e) => form.setFieldValue('cuil', formatCuil(e.currentTarget.value))}
              />
            </SimpleGrid>
            {suggestions.length > 0 && (
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  CUIL sugeridos:
                </Text>
                {suggestions.map((c) => (
                  <UnstyledButton key={c} onClick={() => form.setFieldValue('cuil', c)}>
                    <Text size="xs" c="brand" fw={600}>
                      {c}
                    </Text>
                  </UnstyledButton>
                ))}
              </Group>
            )}
          </Section>
        )}

        <Section title="Contacto">
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <TextInput
              label="Teléfono"
              inputMode="tel"
              placeholder="11 5555-1234"
              {...form.getInputProps('phone')}
            />
            <TextInput
              label="Email"
              inputMode="email"
              autoCapitalize="none"
              {...form.getInputProps('email')}
            />
          </SimpleGrid>
        </Section>

        <Section title="Domicilio" hint="Opcional, pero si lo cargás va completo">
          <SimpleGrid cols={{ base: 3 }}>
            <TextInput
              label="Calle"
              style={{ gridColumn: 'span 2' }}
              {...form.getInputProps('street')}
            />
            <TextInput label="Altura" inputMode="numeric" {...form.getInputProps('number')} />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 2 }}>
            <TextInput label="Piso / Depto" {...form.getInputProps('apartment')} />
            <TextInput label="Cód. postal" {...form.getInputProps('postalCode')} />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <TextInput label="Localidad" {...form.getInputProps('city')} />
            <Select
              label="Provincia"
              data={PROVINCES}
              searchable
              clearable
              {...form.getInputProps('province')}
            />
          </SimpleGrid>
        </Section>

        <Section
          title={mode === 'self' ? 'Mi cuenta para cobrar' : 'Cuenta del vendedor'}
          hint="Donde se le transfieren las comisiones. Opcional: se puede cargar después"
        >
          <TextInput
            label="CBU / CVU (opcional)"
            inputMode="numeric"
            placeholder="22 dígitos"
            description={detectedBank ?? undefined}
            {...form.getInputProps('cbu')}
            onChange={(e) => {
              const value = onlyDigits(e.currentTarget.value).slice(0, 22);
              form.setFieldValue('cbu', value);
              const bank = bankFromCbu(value);
              if (bank && !form.values.bankName) form.setFieldValue('bankName', bank);
            }}
          />
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <TextInput
              label="Alias (opcional)"
              autoCapitalize="characters"
              {...form.getInputProps('alias')}
            />
            <TextInput label="Banco (opcional)" {...form.getInputProps('bankName')} />
          </SimpleGrid>
        </Section>

        {mode === 'create' && (
          <Section title="Acceso y comisión">
            <SimpleGrid cols={{ base: 1, xs: 2 }}>
              <TextInput
                label="Usuario"
                autoCapitalize="none"
                autoComplete="off"
                {...form.getInputProps('username')}
              />
              <PasswordInput
                label="Contraseña inicial"
                autoComplete="new-password"
                description="Mínimo 8 caracteres"
                {...form.getInputProps('password')}
              />
            </SimpleGrid>
            <NumberInput
              label="Comisión por cuota cobrada"
              description="El vendedor no ve este porcentaje"
              suffix=" %"
              decimalSeparator=","
              decimalScale={2}
              min={0}
              max={99.99}
              {...form.getInputProps('commissionPercent')}
            />
          </Section>
        )}

        <Group justify="flex-end">
          <Button type="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Stack gap="xs">
      <Stack gap={0}>
        <Text fw={700}>{title}</Text>
        {hint && (
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        )}
      </Stack>
      {children}
    </Stack>
  );
}
