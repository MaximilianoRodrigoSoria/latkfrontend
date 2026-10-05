import { Button, Card, Group, Skeleton, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '../../api/endpoints';
import type { CollectionAccount } from '../../api/types';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatDate } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';
import {
  bankFromCbu,
  formatCuil,
  onlyDigits,
  validateCbu,
  validateCuil,
} from '../customers/validators';
import { CollectionAccountCard } from './CollectionAccountCard';

interface Values {
  holderName: string;
  holderCuit: string;
  cbu: string;
  alias: string;
  bankName: string;
  instructions: string;
}

/** El administrador carga la cuenta donde los vendedores le transfieren lo cobrado. */
export function CollectionAccountPage() {
  const account = useQuery({
    queryKey: queryKeys.collectionAccount,
    queryFn: api.collectionAccount,
  });

  return (
    <Stack>
      <PageHeader
        title="Cuenta para rendiciones"
        description="Los vendedores ven esta cuenta para transferirte lo que cobran"
      />
      {account.isLoading && <Skeleton h={300} />}
      {account.isSuccess && (
        <AccountForm key={account.data?.updatedAt ?? 'nueva'} current={account.data} />
      )}
      {account.data && (
        <>
          <Text fw={700} mt="sm">
            Así la ven los vendedores
          </Text>
          <CollectionAccountCard />
        </>
      )}
    </Stack>
  );
}

function AccountForm({ current }: { current?: CollectionAccount }) {
  const queryClient = useQueryClient();
  const form = useForm<Values>({
    initialValues: {
      holderName: current?.holderName ?? '',
      holderCuit: current?.holderCuit ? formatCuil(current.holderCuit) : '',
      cbu: current?.cbu ?? '',
      alias: current?.alias ?? '',
      bankName: current?.bankName ?? '',
      instructions: current?.instructions ?? '',
    },
    validate: {
      holderName: (v) => (v.trim() ? null : 'Obligatorio'),
      holderCuit: (v) => (!v.trim() ? null : validateCuil(v)),
      cbu: validateCbu,
      alias: (v) =>
        !v.trim() || /^[A-Za-z0-9.-]{6,20}$/.test(v.trim())
          ? null
          : '6 a 20 caracteres: letras, números, punto o guion',
    },
  });

  const save = useMutation({
    mutationFn: (v: Values) =>
      api.updateCollectionAccount({
        holderName: v.holderName.trim(),
        holderCuit: v.holderCuit.trim() ? onlyDigits(v.holderCuit) : null,
        cbu: onlyDigits(v.cbu),
        alias: v.alias.trim() || null,
        bankName: v.bankName.trim() || null,
        instructions: v.instructions.trim() || null,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.collectionAccount, saved);
      notifySuccess('Cuenta para rendiciones guardada');
    },
    onError: (error) => notifyError(error),
  });

  return (
    <Card withBorder padding="md">
      <form onSubmit={form.onSubmit((v) => save.mutate(v))}>
        <Stack>
          <TextInput label="Titular" {...form.getInputProps('holderName')} />
          <TextInput
            label="CUIT del titular (opcional)"
            inputMode="numeric"
            {...form.getInputProps('holderCuit')}
            onChange={(e) => form.setFieldValue('holderCuit', formatCuil(e.currentTarget.value))}
          />
          <TextInput
            label="CBU / CVU"
            inputMode="numeric"
            placeholder="22 dígitos"
            description={bankFromCbu(form.values.cbu) ?? undefined}
            {...form.getInputProps('cbu')}
            onChange={(e) => {
              const value = onlyDigits(e.currentTarget.value).slice(0, 22);
              form.setFieldValue('cbu', value);
              const bank = bankFromCbu(value);
              if (bank && !form.values.bankName) form.setFieldValue('bankName', bank);
            }}
          />
          <Group grow>
            <TextInput label="Alias (opcional)" {...form.getInputProps('alias')} />
            <TextInput label="Banco (opcional)" {...form.getInputProps('bankName')} />
          </Group>
          <Textarea
            label="Indicaciones para el vendedor (opcional)"
            placeholder="Ej.: poner en el concepto el nombre del cliente"
            autosize
            minRows={2}
            maxLength={300}
            {...form.getInputProps('instructions')}
          />
          {current?.updatedAt && (
            <Text size="xs" c="dimmed">
              Última modificación: {formatDate(current.updatedAt)}
              {current.updatedBy && ` por ${current.updatedBy}`}
            </Text>
          )}
          <Group justify="flex-end">
            <Button type="submit" loading={save.isPending}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}
