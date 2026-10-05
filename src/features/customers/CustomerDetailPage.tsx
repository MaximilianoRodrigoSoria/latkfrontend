import {
  Anchor,
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconArrowLeft,
  IconBrandWhatsapp,
  IconCashPlus,
  IconPencil,
  IconPhone,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import type { CustomerRequest } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, Permission } from '../../auth/permissions';
import { LoanCard } from '../loans/LoansPage';
import { isOpen } from '../loans/loanDraft';
import { formatDate, formatMoneyShort } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';
import { CustomerForm, fromCustomer } from './CustomerForm';
import { CustomerActivityCard } from './CustomerActivityCard';
import { ageAt } from './validators';

export function CustomerDetailPage() {
  const { id = '' } = useParams();
  const customer = useQuery({ queryKey: queryKeys.customer(id), queryFn: () => api.customer(id) });
  const c = customer.data;
  const user = useAuthStore((s) => s.user);
  const canRequest = hasPermission(user, Permission.LOAN_REQUEST);
  const loans = useQuery({ queryKey: queryKeys.loans, queryFn: api.loans });
  const customerLoans = loans.data?.filter((l) => l.customerId === id) ?? [];
  const hasOpenLoan = customerLoans.some((l) => isOpen(l.status));
  const canEdit = hasPermission(user, Permission.CUSTOMER_UPDATE);
  const [editing, editor] = useDisclosure(false);
  const mobile = useMediaQuery('(max-width: 48em)');
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: (request: CustomerRequest) =>
      api.updateCustomer(id, { version: c!.version, data: request }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.customer(id), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.customerActivity(id) });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      // Los recordatorios de WhatsApp de sus prestamos usan el telefono nuevo.
      void queryClient.invalidateQueries({ queryKey: ['loan'] });
      editor.close();
      notifySuccess('Datos del cliente actualizados');
    },
    onError: (error) => {
      notifyError(error);
      // 409: otro lo cambio mientras tanto; se recargan los datos actuales.
      void queryClient.invalidateQueries({ queryKey: queryKeys.customer(id) });
    },
  });

  return (
    <Stack>
      <Anchor component={Link} to="/customers" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} /> Clientes
        </Group>
      </Anchor>

      {customer.isLoading && <Skeleton h={300} />}
      {customer.isError && <Text c="red">{customer.error.message}</Text>}

      {c && (
        <>
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={2}>
              <Title order={2} size="h3">
                {c.firstName} {c.lastName}
              </Title>
              <Text c="dimmed" size="sm">
                DNI {c.dni} · CUIL {c.cuil}
              </Text>
            </Stack>
            {canEdit && (
              <Button
                variant="light"
                size="sm"
                leftSection={<IconPencil size={16} />}
                onClick={editor.open}
              >
                Editar
              </Button>
            )}
          </Group>

          <Group grow>
            <Button
              component="a"
              href={`tel:${c.phone}`}
              variant="light"
              leftSection={<IconPhone size={18} />}
            >
              Llamar
            </Button>
            <Button
              component="a"
              href={`https://wa.me/549${c.phone.replace(/^0/, '')}`}
              target="_blank"
              rel="noreferrer"
              variant="light"
              color="green"
              leftSection={<IconBrandWhatsapp size={18} />}
            >
              WhatsApp
            </Button>
          </Group>

          {canRequest &&
            (hasOpenLoan ? (
              <Button disabled leftSection={<IconCashPlus size={18} />}>
                Tiene un préstamo en curso
              </Button>
            ) : (
              <Button
                component={Link}
                to={`/loans/new?customerId=${c.id}`}
                leftSection={<IconCashPlus size={18} />}
              >
                Nuevo préstamo
              </Button>
            ))}

          {customerLoans.length > 0 && (
            <Stack gap="xs">
              <Text fw={700}>Préstamos</Text>
              {customerLoans.map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
              ))}
            </Stack>
          )}

          <CustomerActivityCard customerId={c.id} />

          <Section title="Datos personales">
            <Row
              label="Nacimiento"
              value={`${formatDate(c.birthDate)} (${ageAt(new Date(c.birthDate))} anos)`}
            />
            <Row label="Telefono" value={c.phone} />
            <Row label="Email" value={c.email} />
            <Row label="Ocupacion" value={c.occupation} />
            <Row
              label="Ingreso mensual"
              value={c.monthlyIncome != null ? formatMoneyShort(c.monthlyIncome) : null}
            />
          </Section>

          <Section title="Domicilio">
            <Row
              label="Direccion"
              value={`${c.address.street} ${c.address.number}${c.address.apartment ? `, ${c.address.apartment}` : ''}`}
            />
            <Row label="Localidad" value={`${c.address.city}, ${c.address.province}`} />
            <Row label="Cod. postal" value={c.address.postalCode} />
          </Section>

          <Section
            title="Cuenta para acreditar"
            badge={
              <Badge variant="light" color={c.bankAccount.virtual ? 'grape' : 'blue'}>
                {c.bankAccount.virtual ? 'CVU' : 'CBU'}
              </Badge>
            }
          >
            <Row label={c.bankAccount.virtual ? 'CVU' : 'CBU'} value={c.bankAccount.cbu} mono />
            <Row label="Alias" value={c.bankAccount.alias} />
            <Row label="Banco" value={c.bankAccount.bankName} />
          </Section>

          {c.notes && (
            <Section title="Notas">
              <Text size="sm">{c.notes}</Text>
            </Section>
          )}

          <Text size="xs" c="dimmed">
            Alta: {formatDate(c.createdAt)}
          </Text>

          <Drawer
            opened={editing}
            onClose={editor.close}
            title={`Editar ${c.firstName} ${c.lastName}`}
            position={mobile ? 'bottom' : 'right'}
            size={mobile ? '94%' : 'lg'}
            radius={mobile ? 'lg' : 0}
          >
            {editing && (
              <CustomerForm
                initial={fromCustomer(c)}
                identityEditable={hasPermission(user, Permission.CUSTOMER_IDENTITY_FIX)}
                submitting={update.isPending}
                onSubmit={(request) => update.mutate(request)}
              />
            )}
          </Drawer>
        </>
      )}
    </Stack>
  );
}

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card withBorder padding="md">
      <Group justify="space-between" mb="xs">
        <Text fw={700}>{title}</Text>
        {badge}
      </Group>
      <Stack gap={6}>{children}</Stack>
    </Card>
  );
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <Group justify="space-between" wrap="nowrap" align="flex-start">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text
        size="sm"
        fw={500}
        ta="right"
        ff={mono ? 'monospace' : undefined}
        style={{ wordBreak: 'break-all' }}
      >
        {value}
      </Text>
    </Group>
  );
}
