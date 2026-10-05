import { Alert, Card, Group, Skeleton, Stack, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '../../api/endpoints';
import type { SellerResponse } from '../../api/types';
import { PageHeader } from '../../shared/components/PageHeader';
import { notifyError, notifySuccess } from '../../shared/notify';
import { formatCuil } from '../customers/validators';
import { CollectionAccountCard } from '../settings/CollectionAccountCard';
import { Completeness } from './Completeness';
import { SellerForm } from './SellerForm';
import { toContactRequest, valuesFrom } from './sellerForm';

/**
 * Mis datos (vendedor): ve todo lo suyo menos su %, edita lo que cambia (telefono, email,
 * domicilio, su CBU) y ve a donde transferir lo que cobra.
 */
export function MyProfilePage() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: queryKeys.mySellerProfile, queryFn: api.mySellerProfile });
  const s = me.data;

  const save = useMutation({
    mutationFn: api.updateMySellerProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.mySellerProfile, updated);
      notifySuccess('Tus datos se guardaron');
    },
    onError: (error) => notifyError(error),
  });

  return (
    <Stack>
      <PageHeader title="Mis datos" description="Tu información y tu cuenta para cobrar" />

      {me.isLoading && <Skeleton h={300} />}
      {me.isError && <Text c="red">{me.error.message}</Text>}

      {s && (
        <>
          {s.completeness < 100 && (
            <Alert icon={<IconInfoCircle />} color="yellow" variant="light">
              Completá tus datos para que el administrador pueda transferirte las comisiones. Si
              falta tu nombre, DNI o CUIL, pedile que los cargue.
            </Alert>
          )}
          <Card withBorder padding="md">
            <Completeness value={s.completeness} missing={s.missingFields} />
          </Card>

          <CollectionAccountCard />

          <Identity seller={s} />

          <Card withBorder padding="md">
            <SellerForm
              key={s.updatedAt}
              mode="self"
              initial={valuesFrom(s)}
              submitting={save.isPending}
              submitLabel="Guardar mis datos"
              onSubmit={(values) => save.mutate(toContactRequest(values))}
            />
          </Card>
        </>
      )}
    </Stack>
  );
}

/** Lo que solo cambia el administrador. */
function Identity({ seller }: { seller: SellerResponse }) {
  return (
    <Card withBorder padding="md">
      <Text fw={700}>Datos personales</Text>
      <Text size="xs" c="dimmed" mb="xs">
        Los corrige el administrador
      </Text>
      <Stack gap={4}>
        <Row label="Nombre" value={seller.fullName} />
        <Row label="Usuario" value={`@${seller.username}`} />
        <Row label="DNI" value={seller.dni} />
        <Row label="CUIL" value={seller.cuil ? formatCuil(seller.cuil) : null} />
      </Stack>
    </Card>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500} c={value ? undefined : 'dimmed'}>
        {value ?? 'Sin cargar'}
      </Text>
    </Group>
  );
}
