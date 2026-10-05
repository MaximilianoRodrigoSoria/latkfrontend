import {
  Anchor,
  Button,
  Card,
  Group,
  NumberInput,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import type { SellerResponse } from '../../api/types';
import { formatDate } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, Permission } from '../../auth/permissions';
import { QuotaAdminCard } from '../quota/QuotaAdminCard';
import { Completeness } from './Completeness';
import { SellerForm } from './SellerForm';
import { toDataRequest, valuesFrom } from './sellerFormModel';

/** El administrador ve y corrige todos los datos del vendedor y su %. */
export function SellerDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const seller = useQuery({ queryKey: queryKeys.seller(id), queryFn: () => api.seller(id) });
  const canManageQuota = hasPermission(
    useAuthStore((st) => st.user),
    Permission.QUOTA_MANAGE,
  );
  const s = seller.data;

  const save = useMutation({
    mutationFn: (body: Parameters<typeof api.updateSeller>[1]) => api.updateSeller(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.seller(id), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.sellers });
      notifySuccess('Datos del vendedor guardados');
    },
    onError: (error) => notifyError(error),
  });

  return (
    <Stack>
      <Anchor component={Link} to="/sellers" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} /> Vendedores
        </Group>
      </Anchor>

      {seller.isLoading && <Skeleton h={300} />}
      {seller.isError && <Text c="red">{seller.error.message}</Text>}

      {s && (
        <>
          <Stack gap={2}>
            <Title order={2} size="h3">
              {s.fullName}
            </Title>
            <Text size="sm" c="dimmed">
              Usuario @{s.username} · alta {formatDate(s.createdAt)}
            </Text>
          </Stack>

          <Card withBorder padding="md">
            <Completeness value={s.completeness} missing={s.missingFields} />
          </Card>

          <CommissionCard seller={s} />

          {canManageQuota && <QuotaAdminCard sellerId={s.userId} />}

          <Card withBorder padding="md">
            {/* key: si cambian los datos en el servidor, el formulario arranca de nuevo. */}
            <SellerForm
              key={s.updatedAt}
              mode="admin"
              initial={valuesFrom(s)}
              submitting={save.isPending}
              submitLabel="Guardar cambios"
              onSubmit={(values) => save.mutate(toDataRequest(values))}
            />
          </Card>
        </>
      )}
    </Stack>
  );
}

function CommissionCard({ seller }: { seller: SellerResponse }) {
  const queryClient = useQueryClient();
  const current = seller.commissionRate != null ? seller.commissionRate * 100 : 0;
  const [percent, setPercent] = useState<number | string>(Math.round(current * 100) / 100);

  const save = useMutation({
    mutationFn: () =>
      api.setSellerCommission(seller.userId, Math.round(Number(percent) * 100) / 10000),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.seller(seller.userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sellers });
      notifySuccess('Comisión actualizada: aplica a los préstamos nuevos');
    },
    onError: (error) => notifyError(error),
  });
  const valid = percent !== '' && Number(percent) >= 0 && Number(percent) < 100;

  return (
    <Card withBorder padding="md">
      <Text fw={700}>Comisión</Text>
      <Text size="xs" c="dimmed" mb="xs">
        Por cada cuota cobrada. Aplica a los préstamos nuevos; el vendedor no ve este porcentaje.
      </Text>
      <Group align="flex-end" wrap="nowrap">
        <NumberInput
          aria-label="Porcentaje de comisión"
          suffix=" %"
          decimalSeparator=","
          decimalScale={2}
          min={0}
          max={99.99}
          value={percent}
          onChange={setPercent}
          style={{ flex: 1 }}
        />
        <Button
          variant="light"
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={!valid || Number(percent) === Math.round(current * 100) / 100}
        >
          Guardar
        </Button>
      </Group>
    </Card>
  );
}
