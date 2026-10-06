import { PullToRefresh } from '../../shared/components/PullToRefresh';
import { ContentMotion } from '../../shared/components/MobileMotion';
import {
  Button,
  Card,
  Chip,
  Drawer,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useOpenFromQuery } from '../../shared/useOpenFromQuery';
import { useDebouncedValue, useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconChevronRight,
  IconPhone,
  IconSearch,
  IconUser,
  IconUserPlus,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import type { LoanResponse } from '../../api/types';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, Permission } from '../../auth/permissions';
import { ListThumb } from '../../shared/components/ListThumb';
import { PageHeader } from '../../shared/components/PageHeader';
import { notifyError, notifySuccess } from '../../shared/notify';
import { CollectionChip } from '../loans/CollectionChip';
import {
  customerCollectionState,
  isDueToday,
  lastPayment,
  lastPaymentLabel,
  readyToRenew,
} from '../loans/collectionState';
import { CustomerForm } from './CustomerForm';

type CustomerFilter = 'ALL' | 'TODAY' | 'OVERDUE' | 'RENEW';
const FILTER_LABEL: Record<CustomerFilter, string> = {
  ALL: 'Todos',
  TODAY: 'Cobrar hoy',
  OVERDUE: 'Atrasados',
  RENEW: 'Para renovar',
};
const FILTER_COLOR: Record<CustomerFilter, string | undefined> = {
  ALL: undefined,
  TODAY: 'blue',
  OVERDUE: 'red',
  RENEW: 'teal',
};

/**
 * Linea de estado del cliente: un solo chip (lo mas urgente de sus prestamos) y cuando pago por
 * ultima vez. Sin prestamos, el telefono.
 */
function CustomerStatusLine({ phone, loans }: { phone: string; loans: LoanResponse[] }) {
  const state = customerCollectionState(loans);
  if (!state) {
    return (
      <Group gap={4}>
        <IconPhone size={14} />
        <Text size="sm">{phone}</Text>
      </Group>
    );
  }
  const last = lastPaymentLabel(lastPayment(loans));
  return (
    <Group gap="xs" wrap="nowrap">
      <CollectionChip state={state} done="Para renovar" />
      {last && (
        <Text size="xs" c="dimmed" truncate>
          {last}
        </Text>
      )}
    </Group>
  );
}

export function CustomersPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPermission(user, Permission.CUSTOMER_CREATE);
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search.trim(), 300);
  const [opened, { open, close }] = useDisclosure(false);
  // En el celular el alta se abre desde el "+" de la barra inferior.
  useOpenFromQuery(open, canCreate);
  const mobile = useMediaQuery('(max-width: 48em)');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();

  const customers = useQuery({
    queryKey: queryKeys.customers(debounced),
    queryFn: () => api.customers(debounced),
  });

  // Los prestamos (ya cacheados en la app) dan el estado de cobro de cada cliente.
  const loans = useQuery({ queryKey: queryKeys.loans, queryFn: api.loans });
  const loansByCustomer = new Map<string, LoanResponse[]>();
  for (const loan of loans.data ?? []) {
    loansByCustomer.set(loan.customerId, [...(loansByCustomer.get(loan.customerId) ?? []), loan]);
  }
  const [filter, setFilter] = useState<CustomerFilter>(() => {
    const requested = params.get('filtro') as CustomerFilter | null;
    return requested && requested in FILTER_LABEL ? requested : 'ALL';
  });
  const matches = (customerId: string, f: CustomerFilter) => {
    const own = loansByCustomer.get(customerId) ?? [];
    const state = customerCollectionState(own);
    switch (f) {
      case 'ALL':
        return true;
      case 'TODAY':
        return isDueToday(state);
      case 'OVERDUE':
        return state?.kind === 'OVERDUE';
      case 'RENEW':
        return readyToRenew(own);
    }
  };
  const visible = customers.data?.filter((c) => matches(c.id, filter)) ?? [];

  const create = useMutation({
    mutationFn: api.createCustomer,
    onSuccess: (customer) => {
      notifySuccess(`${customer.firstName} ${customer.lastName} dado de alta`);
      close();
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate(`/customers/${customer.id}`);
    },
    onError: (error) => notifyError(error),
  });

  return (
    <Stack pb={canCreate ? 88 : 0}>
      <PageHeader
        title="Clientes"
        description="Tu cartera de clientes"
        action={
          canCreate && !mobile ? (
            <Button leftSection={<IconUserPlus size={18} />} onClick={open}>
              Nuevo cliente
            </Button>
          ) : undefined
        }
      />
      <TextInput
        placeholder="Buscar por nombre o DNI"
        leftSection={<IconSearch size={18} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />

      {customers.data && customers.data.length > 0 && (
        <Chip.Group value={filter} onChange={(v) => setFilter(v as CustomerFilter)}>
          <Group gap="xs">
            {(Object.keys(FILTER_LABEL) as CustomerFilter[]).map((f) => (
              <Chip key={f} value={f} color={FILTER_COLOR[f]}>
                {FILTER_LABEL[f]}
                {f !== 'ALL' &&
                  loans.data &&
                  ` (${customers.data.filter((c) => matches(c.id, f)).length})`}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      )}

      <PullToRefresh
        onRefresh={async () => {
          await Promise.all([
            customers.refetch({ throwOnError: true }),
            loans.refetch({ throwOnError: true }),
          ]);
        }}
      />
      {customers.isLoading && <Skeleton h={80} />}
      {customers.data && visible.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          {filter !== 'ALL'
            ? 'No hay clientes en este grupo.'
            : debounced
              ? 'No hay clientes que coincidan.'
              : 'Todavia no tenes clientes.'}
        </Text>
      )}

      <ContentMotion replayKey={filter}>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {visible.map((customer) => (
            <Card
              key={customer.id}
              withBorder
              padding="md"
              component={Link}
              to={`/customers/${customer.id}`}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <ListThumb>
                    <IconUser size={24} stroke={1.8} />
                  </ListThumb>
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text fw={700}>{customer.fullName}</Text>
                    <Text size="sm" c="dimmed">
                      DNI {customer.dni} · {customer.city}
                    </Text>
                    <CustomerStatusLine
                      phone={customer.phone}
                      loans={loansByCustomer.get(customer.id) ?? []}
                    />
                  </Stack>
                </Group>
                <IconChevronRight size={20} color="var(--mantine-color-dimmed)" />
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </ContentMotion>
      <Drawer
        opened={opened}
        onClose={close}
        title="Nuevo cliente"
        position={mobile ? 'bottom' : 'right'}
        size={mobile ? '94%' : 'lg'}
        radius={mobile ? 'lg' : 0}
      >
        {opened && (
          <CustomerForm
            submitting={create.isPending}
            onSubmit={(request) => create.mutate(request)}
          />
        )}
      </Drawer>
    </Stack>
  );
}
