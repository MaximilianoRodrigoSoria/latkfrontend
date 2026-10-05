import { Anchor, Badge, Button, Card, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconBrandWhatsapp, IconCashPlus, IconPhone } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, Permission } from '../../auth/permissions';
import { LoanCard } from '../loans/LoansPage';
import { isOpen } from '../loans/loanDraft';
import { formatDate, formatMoneyShort } from '../../shared/format';
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
          <Stack gap={2}>
            <Title order={2} size="h3">
              {c.firstName} {c.lastName}
            </Title>
            <Text c="dimmed" size="sm">
              DNI {c.dni} · CUIL {c.cuil}
            </Text>
          </Stack>

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
