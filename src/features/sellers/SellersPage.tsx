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
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconChevronRight, IconPhone, IconSearch, IconUserPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import { PageHeader } from '../../shared/components/PageHeader';
import { notifyError, notifySuccess } from '../../shared/notify';
import { QuotaBar, useAllQuotas } from '../quota/QuotaAdminCard';
import { Completeness } from './Completeness';
import { SellerForm } from './SellerForm';
import { toNewSellerRequest } from './sellerFormModel';

/** Administracion de vendedores (permiso seller.manage). */
export function SellersPage() {
  const quotas = useAllQuotas();
  const quotaOf = (id: string) => quotas.data?.find((q) => q.sellerId === id);
  const [search, setSearch] = useState('');
  const [opened, { open, close }] = useDisclosure(false);
  const mobile = useMediaQuery('(max-width: 48em)');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sellers = useQuery({ queryKey: queryKeys.sellers, queryFn: api.sellers });
  const term = search.trim().toLowerCase();
  const visible =
    sellers.data?.filter(
      (s) =>
        !term ||
        s.fullName.toLowerCase().includes(term) ||
        s.username.includes(term) ||
        (s.dni ?? '').includes(term),
    ) ?? [];

  const create = useMutation({
    mutationFn: api.createSeller,
    onSuccess: (seller) => {
      notifySuccess(`${seller.fullName} dado de alta. Usuario: ${seller.username}`);
      close();
      void queryClient.invalidateQueries({ queryKey: queryKeys.sellers });
      navigate(`/sellers/${seller.userId}`);
    },
    onError: (error) => notifyError(error),
  });

  return (
    <Stack pb={mobile ? 88 : 0}>
      <PageHeader
        title="Vendedores"
        description="Alta, datos y cuenta de cada vendedor"
        action={
          !mobile ? (
            <Button leftSection={<IconUserPlus size={18} />} onClick={open}>
              Nuevo vendedor
            </Button>
          ) : undefined
        }
      />
      <TextInput
        placeholder="Buscar por nombre, usuario o DNI"
        leftSection={<IconSearch size={18} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />

      {sellers.isLoading && <Skeleton h={90} />}
      {sellers.data && visible.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          {term ? 'No hay vendedores que coincidan.' : 'Todavía no hay vendedores.'}
        </Text>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {visible.map((s) => (
          <Card key={s.userId} withBorder padding="md" component={Link} to={`/sellers/${s.userId}`}>
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Stack gap={6} style={{ flex: 1 }}>
                <Stack gap={0}>
                  <Text fw={700}>{s.fullName}</Text>
                  <Text size="xs" c="dimmed">
                    @{s.username}
                    {s.commissionRate != null &&
                      ` · ${(s.commissionRate * 100).toLocaleString('es-AR')} %`}
                  </Text>
                </Stack>
                {s.phone && (
                  <Group gap={4}>
                    <IconPhone size={14} />
                    <Text size="sm">{s.phone}</Text>
                  </Group>
                )}
                <Completeness value={s.completeness} missing={s.missingFields} compact />
                {quotaOf(s.userId) && <QuotaBar quota={quotaOf(s.userId)!} />}
              </Stack>
              <IconChevronRight size={20} color="var(--mantine-color-dimmed)" />
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {mobile && !opened && (
        <Affix position={{ bottom: 'calc(88px + env(safe-area-inset-bottom))', right: 20 }}>
          <Button radius="xl" size="lg" leftSection={<IconUserPlus size={20} />} onClick={open}>
            Nuevo
          </Button>
        </Affix>
      )}

      <Drawer
        opened={opened}
        onClose={close}
        title="Nuevo vendedor"
        position={mobile ? 'bottom' : 'right'}
        size={mobile ? '94%' : 'lg'}
        radius={mobile ? 'lg' : 0}
      >
        {opened && (
          <SellerForm
            mode="create"
            submitting={create.isPending}
            submitLabel="Dar de alta"
            onSubmit={(values) => create.mutate(toNewSellerRequest(values))}
          />
        )}
      </Drawer>
    </Stack>
  );
}
