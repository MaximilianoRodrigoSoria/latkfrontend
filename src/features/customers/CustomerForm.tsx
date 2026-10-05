import {
  Button,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconBuildingBank, IconHome, IconUser } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useState } from 'react';
import type { CustomerRequest, CustomerResponse } from '../../api/types';
import {
  ageAt,
  bankFromCbu,
  formatCuil,
  onlyDigits,
  PROVINCES,
  suggestCuils,
  validateCbu,
  validateCuil,
} from './validators';

export interface CustomerFormValues {
  firstName: string;
  lastName: string;
  dni: string;
  cuil: string;
  birthDate: string | null;
  phone: string;
  email: string;
  street: string;
  number: string;
  apartment: string;
  city: string;
  province: string | null;
  postalCode: string;
  cbu: string;
  alias: string;
  bankName: string;
  occupation: string;
  monthlyIncome: number | string;
  notes: string;
}

const EMPTY: CustomerFormValues = {
  firstName: '',
  lastName: '',
  dni: '',
  cuil: '',
  birthDate: null,
  phone: '',
  email: '',
  street: '',
  number: '',
  apartment: '',
  city: '',
  province: 'Buenos Aires',
  postalCode: '',
  cbu: '',
  alias: '',
  bankName: '',
  occupation: '',
  monthlyIncome: '',
  notes: '',
};

/** Campos que se validan en cada paso: no se avanza con errores del paso actual. */
const STEP_FIELDS: (keyof CustomerFormValues)[][] = [
  ['firstName', 'lastName', 'dni', 'cuil', 'birthDate'],
  ['phone', 'email', 'street', 'number', 'city', 'province'],
  ['cbu', 'alias'],
];

const blank = (v: string) => (v.trim() ? null : 'Obligatorio');
const orNull = (v: string) => (v.trim() ? v.trim() : null);

export function toCustomerRequest(v: CustomerFormValues): CustomerRequest {
  return {
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    dni: onlyDigits(v.dni),
    cuil: onlyDigits(v.cuil),
    birthDate: dayjs(v.birthDate).format('YYYY-MM-DD'),
    phone: onlyDigits(v.phone),
    email: orNull(v.email),
    address: {
      street: v.street.trim(),
      number: v.number.trim(),
      apartment: orNull(v.apartment),
      city: v.city.trim(),
      province: v.province ?? '',
      postalCode: orNull(v.postalCode),
    },
    bankAccount: { cbu: onlyDigits(v.cbu), alias: orNull(v.alias), bankName: orNull(v.bankName) },
    occupation: orNull(v.occupation),
    monthlyIncome: v.monthlyIncome === '' ? null : Number(v.monthlyIncome),
    notes: orNull(v.notes),
  };
}

/** Datos actuales de un cliente para editarlos con el mismo formulario del alta. */
export function fromCustomer(c: CustomerResponse): CustomerFormValues {
  return {
    firstName: c.firstName,
    lastName: c.lastName,
    dni: c.dni,
    cuil: formatCuil(c.cuil),
    birthDate: c.birthDate,
    phone: c.phone,
    email: c.email ?? '',
    street: c.address.street,
    number: c.address.number,
    apartment: c.address.apartment ?? '',
    city: c.address.city,
    province: c.address.province,
    postalCode: c.address.postalCode ?? '',
    cbu: c.bankAccount.cbu,
    alias: c.bankAccount.alias ?? '',
    bankName: c.bankAccount.bankName ?? '',
    occupation: c.occupation ?? '',
    monthlyIncome: c.monthlyIncome ?? '',
    notes: c.notes ?? '',
  };
}

interface CustomerFormProps {
  submitting: boolean;
  onSubmit: (request: CustomerRequest) => void;
  /** Edicion: datos actuales. DNI y CUIL quedan fijos (identifican a la persona). */
  initial?: CustomerFormValues;
  /** Edicion: nombre, apellido y nacimiento solo los corrige quien tiene permiso (admin). */
  identityEditable?: boolean;
}

export function CustomerForm({
  submitting,
  onSubmit,
  initial,
  identityEditable = false,
}: CustomerFormProps) {
  const editing = initial !== undefined;
  const lockIdentity = editing && !identityEditable;
  // Al editar se abre en Contacto: es lo que mas cambia (telefono, domicilio).
  const [step, setStep] = useState(editing ? 1 : 0);
  const form = useForm<CustomerFormValues>({
    initialValues: initial ?? EMPTY,
    validate: {
      firstName: blank,
      lastName: blank,
      dni: (v) => (/^\d{7,8}$/.test(onlyDigits(v)) ? null : 'DNI de 7 u 8 digitos'),
      cuil: (v, values) => validateCuil(v, values.dni),
      birthDate: (v) => {
        if (!v) return 'Obligatorio';
        const age = ageAt(new Date(v));
        if (age < 18) return 'Debe ser mayor de 18 anos';
        return age > 90 ? 'Revisa la fecha' : null;
      },
      phone: (v) => (/^\d{8,15}$/.test(onlyDigits(v)) ? null : 'Entre 8 y 15 digitos'),
      email: (v) => (!v.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? null : 'Email invalido'),
      street: blank,
      number: blank,
      city: blank,
      province: (v) => (v ? null : 'Obligatorio'),
      cbu: validateCbu,
      alias: (v) =>
        !v.trim() || /^[A-Za-z0-9.-]{6,20}$/.test(v.trim())
          ? null
          : '6 a 20 caracteres: letras, numeros, punto o guion',
    },
  });

  const next = () => {
    const errors = STEP_FIELDS[step]!.map((field) => form.validateField(field).hasError);
    if (!errors.some(Boolean)) setStep((s) => s + 1);
  };

  // Al guardar con errores en un paso que no se ve, se salta a ese paso.
  const showFirstError = (errors: Partial<Record<keyof CustomerFormValues, unknown>>) => {
    const index = STEP_FIELDS.findIndex((fields) => fields.some((f) => errors[f]));
    if (index >= 0) setStep(index);
  };

  const suggestions = form.values.cuil ? [] : suggestCuils(form.values.dni);
  const detectedBank = bankFromCbu(form.values.cbu);

  return (
    <form onSubmit={form.onSubmit((values) => onSubmit(toCustomerRequest(values)), showFirstError)}>
      <Stepper
        active={step}
        onStepClick={(s) => (editing || s < step) && setStep(s)}
        allowNextStepsSelect={editing}
        size="sm"
        mb="md"
      >
        <Stepper.Step icon={<IconUser size={18} />} label="Persona">
          <Stack>
            <SimpleGrid cols={{ base: 1, xs: 2 }}>
              <TextInput
                label="Nombre"
                autoComplete="off"
                disabled={lockIdentity}
                {...form.getInputProps('firstName')}
              />
              <TextInput
                label="Apellido"
                autoComplete="off"
                disabled={lockIdentity}
                {...form.getInputProps('lastName')}
              />
            </SimpleGrid>
            {editing && (
              <Text size="xs" c="dimmed">
                {lockIdentity
                  ? 'Nombre, apellido y nacimiento los corrige el administrador. DNI y CUIL no se modifican.'
                  : 'DNI y CUIL no se modifican: si es otra persona, dala de alta como cliente nuevo.'}
              </Text>
            )}
            <TextInput
              label="DNI"
              inputMode="numeric"
              placeholder="12345678"
              disabled={editing}
              {...form.getInputProps('dni')}
            />
            <TextInput
              label="CUIL"
              inputMode="numeric"
              placeholder="20-12345678-6"
              disabled={editing}
              {...form.getInputProps('cuil')}
              onChange={(e) => form.setFieldValue('cuil', formatCuil(e.currentTarget.value))}
            />
            {suggestions.length > 0 && (
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  Sugeridos:
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
            <DateInput
              label="Fecha de nacimiento"
              placeholder="DD/MM/AAAA"
              valueFormat="DD/MM/YYYY"
              maxDate={dayjs().subtract(18, 'year').format('YYYY-MM-DD')}
              defaultDate={dayjs().subtract(30, 'year').format('YYYY-MM-DD')}
              disabled={lockIdentity}
              {...form.getInputProps('birthDate')}
            />
          </Stack>
        </Stepper.Step>

        <Stepper.Step icon={<IconHome size={18} />} label="Contacto">
          <Stack>
            <TextInput
              label="Telefono"
              inputMode="tel"
              placeholder="11 5555-1234"
              {...form.getInputProps('phone')}
            />
            <TextInput
              label="Email (opcional)"
              inputMode="email"
              autoCapitalize="none"
              {...form.getInputProps('email')}
            />
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
              <TextInput label="Cod. postal" {...form.getInputProps('postalCode')} />
            </SimpleGrid>
            <TextInput label="Localidad" {...form.getInputProps('city')} />
            <Select
              label="Provincia"
              data={PROVINCES}
              searchable
              allowDeselect={false}
              {...form.getInputProps('province')}
            />
          </Stack>
        </Stepper.Step>

        <Stepper.Step icon={<IconBuildingBank size={18} />} label="Banco">
          <Stack>
            <TextInput
              label="CBU / CVU"
              inputMode="numeric"
              placeholder="22 digitos"
              description={detectedBank ?? 'Cuenta donde se acredita el prestamo'}
              {...form.getInputProps('cbu')}
              onChange={(e) => {
                const value = onlyDigits(e.currentTarget.value).slice(0, 22);
                form.setFieldValue('cbu', value);
                const bank = bankFromCbu(value);
                if (bank && !form.values.bankName) form.setFieldValue('bankName', bank);
              }}
            />
            <TextInput
              label="Alias (opcional)"
              autoCapitalize="characters"
              {...form.getInputProps('alias')}
            />
            <TextInput label="Banco (opcional)" {...form.getInputProps('bankName')} />
            <TextInput label="Ocupacion (opcional)" {...form.getInputProps('occupation')} />
            <NumberInput
              label="Ingreso mensual (opcional)"
              prefix="$ "
              thousandSeparator="."
              decimalSeparator=","
              min={0}
              {...form.getInputProps('monthlyIncome')}
            />
            <Textarea
              label="Notas (opcional)"
              autosize
              minRows={2}
              maxLength={500}
              {...form.getInputProps('notes')}
            />
          </Stack>
        </Stepper.Step>
      </Stepper>

      {editing ? (
        <Button type="submit" fullWidth loading={submitting} disabled={!form.isDirty()}>
          Guardar cambios
        </Button>
      ) : (
        <Group grow>
          {step > 0 && (
            <Button variant="default" onClick={() => setStep((s) => s - 1)}>
              Atras
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={next}>Siguiente</Button>
          ) : (
            <Button type="submit" loading={submitting}>
              Dar de alta
            </Button>
          )}
        </Group>
      )}
    </form>
  );
}
