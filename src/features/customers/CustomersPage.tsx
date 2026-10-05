import {
  Affix,
  Button,
  Card,
  Drawer,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconChevronRight, IconPhone, IconSearch, IconUserPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, Permission } from '../../auth/permissions';
import { PageHeader } from '../../shared/components/PageHeader';
import { notifyError, notifySuccess } from '../../shared/notify';
import { CustomerForm } from './CustomerForm';

export function CustomersPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPermission(user, Permission.CUSTOMER_CREATE);
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search.trim(), 300);
  const [opened, { open, close }] = useDisclosure(false);
  const mobile = useMediaQuery('(max-width: 48em)');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const customers = useQuery({
    queryKey: queryKeys.customers(debounced),
    queryFn: () => api.customers(debounced),
  });

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

      {customers.isLoading && <Skeleton h={80} />}
      {customers.data?.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          {debounced ? 'No hay clientes que coincidan.' : 'Todavia no tenes clientes.'}
        </Text>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {customers.data?.map((customer) => (
          <Card
            key={customer.id}
            withBorder
            padding="md"
            component={Link}
            to={`/customers/${customer.id}`}
          >
            <Group justify="space-between" wrap="nowrap">
              <Stack gap={2}>
                <Text fw={700}>{customer.fullName}</Text>
                <Text size="sm" c="dimmed">
                  DNI {customer.dni} · {customer.city}
                </Text>
                <Group gap={4}>
                  <IconPhone size={14} />
                  <Text size="sm">{customer.phone}</Text>
                </Group>
              </Stack>
              <IconChevronRight size={20} color="var(--mantine-color-dimmed)" />
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {canCreate && mobile && !opened && (
        <Affix position={{ bottom: 'calc(88px + env(safe-area-inset-bottom))', right: 20 }}>
          <Button radius="xl" size="lg" leftSection={<IconUserPlus size={20} />} onClick={open}>
            Nuevo
          </Button>
        </Affix>
      )}

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
