import { Card, Radio, Skeleton, Stack, Text } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '../../api/endpoints';
import type { InterestMethod } from '../../api/types';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatDateTime } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';

export const INTEREST_METHOD_LABEL: Record<InterestMethod, string> = {
  FRENCH: 'Amortización francesa',
  FLAT: 'Interés plano',
};

const HELP: Record<InterestMethod, string> = {
  FRENCH:
    'La tasa de cada categoría es por cuota (por período). Cuota fija con interés sobre el saldo.',
  FLAT: 'La tasa es por todo el plazo. Ej.: $100.000 al 52 % en 38 cuotas diarias = 38 cuotas de $4.000.',
};

/**
 * Como se calculan los creditos nuevos. Solo el admin: el vendedor nunca ve el metodo ni la tasa.
 * Los prestamos existentes no cambian: cada uno guarda el metodo con que se calculo.
 */
export function LendingSettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: queryKeys.lendingSettings, queryFn: api.lendingSettings });
  const change = useMutation({
    mutationFn: (interestMethod: InterestMethod) => api.changeLendingSettings({ interestMethod }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.lendingSettings, updated);
      // Las ofertas y simulaciones cambian con el metodo.
      void queryClient.invalidateQueries({ queryKey: ['offers'] });
      notifySuccess(`Créditos nuevos con ${INTEREST_METHOD_LABEL[updated.interestMethod]}`);
    },
    onError: (error) => notifyError(error),
  });

  return (
    <Stack>
      <PageHeader
        title="Configuración de créditos"
        description="Cómo se calculan las cuotas de los préstamos nuevos"
      />
      {settings.isLoading && <Skeleton h={160} />}
      {settings.data && (
        <Card withBorder padding="md">
          <Radio.Group
            label="Método de interés"
            value={settings.data.interestMethod}
            onChange={(v) => change.mutate(v as InterestMethod)}
          >
            <Stack gap="sm" mt="xs">
              {(Object.keys(INTEREST_METHOD_LABEL) as InterestMethod[]).map((m) => (
                <Radio
                  key={m}
                  value={m}
                  label={INTEREST_METHOD_LABEL[m]}
                  description={HELP[m]}
                  disabled={change.isPending}
                />
              ))}
            </Stack>
          </Radio.Group>
          <Text size="xs" c="dimmed" mt="md">
            Los préstamos ya pedidos no cambian.
            {settings.data.updatedAt &&
              ` Último cambio: ${formatDateTime(settings.data.updatedAt)}${settings.data.updatedByName ? ` · ${settings.data.updatedByName}` : ''}.`}
          </Text>
        </Card>
      )}
    </Stack>
  );
}
