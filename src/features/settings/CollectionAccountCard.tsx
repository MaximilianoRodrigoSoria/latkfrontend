import { ActionIcon, Card, CopyButton, Group, Skeleton, Stack, Text, Tooltip } from '@mantine/core';
import { IconBuildingBank, IconCheck, IconCopy } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '../../api/endpoints';
import { formatCuil } from '../customers/validators';

/**
 * A donde transfiere el vendedor lo que cobra. La carga el administrador en Configuracion; si
 * todavia no la cargo se avisa.
 */
export function CollectionAccountCard({ compact }: { compact?: boolean }) {
  const account = useQuery({
    queryKey: queryKeys.collectionAccount,
    queryFn: api.collectionAccount,
    staleTime: 5 * 60_000,
  });
  const a = account.data;

  return (
    <Card withBorder padding="md" style={{ borderColor: 'var(--mantine-color-brand-4)' }}>
      <Group gap="xs" mb="xs" wrap="nowrap">
        <IconBuildingBank size={20} color="var(--mantine-color-brand-6)" />
        <Text fw={700}>Dónde transferir lo cobrado</Text>
      </Group>
      {account.isLoading && <Skeleton h={60} />}
      {account.isSuccess && !a && (
        <Text size="sm" c="dimmed">
          El administrador todavía no cargó la cuenta. Consultale antes de transferir.
        </Text>
      )}
      {a && (
        <Stack gap={6}>
          <Text size="sm">
            Titular: <b>{a.holderName}</b>
            {a.holderCuit && !compact && ` · CUIT ${formatCuil(a.holderCuit)}`}
          </Text>
          <CopyRow label={a.virtual ? 'CVU' : 'CBU'} value={a.cbu} />
          {a.alias && <CopyRow label="Alias" value={a.alias} />}
          {a.bankName && (
            <Text size="sm" c="dimmed">
              {a.bankName}
            </Text>
          )}
          {a.instructions && !compact && (
            <Text size="sm" c="brand">
              {a.instructions}
            </Text>
          )}
        </Stack>
      )}
    </Card>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="sm" fw={600} ff="monospace" style={{ wordBreak: 'break-all' }}>
          {value}
        </Text>
      </Stack>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? 'Copiado' : 'Copiar'}>
            <ActionIcon variant="subtle" onClick={copy} aria-label={`Copiar ${label}`}>
              {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}
