import {
  Button,
  Card,
  Group,
  NumberInput,
  Radio,
  Skeleton,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { InterestMethod, LendingSettings, LoanInterestMethod } from '../../api/types';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatDateTime } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';

export const INTEREST_METHOD_LABEL: Record<InterestMethod, string> = {
  FRENCH: 'Amortización francesa',
  FLAT: 'Interés plano',
};

/** Incluye la cuota fija, que no es opcion general: la define cada producto. */
export const LOAN_METHOD_LABEL: Record<LoanInterestMethod, string> = {
  ...INTEREST_METHOD_LABEL,
  FIXED_INSTALLMENT: 'Cuota fija',
};

const HELP: Record<InterestMethod, string> = {
  FRENCH:
    'La tasa de cada categoría es por cuota (por período). Cuota fija con interés sobre el saldo.',
  FLAT: 'La tasa es por todo el plazo. Ej.: $100.000 al 52 % en 38 cuotas diarias = 38 cuotas de $4.000.',
};

type Values = Omit<LendingSettings, 'updatedAt' | 'updatedByName'>;

/**
 * Como se calculan los creditos nuevos y que cargos se aplican. Solo el admin: el vendedor nunca ve
 * el metodo ni la tasa. Todo lo nuevo arranca apagado: el negocio no cambia hasta activarlo.
 */
export function LendingSettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: queryKeys.lendingSettings, queryFn: api.lendingSettings });
  const save = useMutation({
    mutationFn: (values: Values) => api.changeLendingSettings(values),
    onSuccess: (updated, values) => {
      queryClient.setQueryData(queryKeys.lendingSettings, updated);
      void queryClient.invalidateQueries({ queryKey: ['offers'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.lendingCharges });
      notifySuccess(
        values.interestMethod !== settings.data?.interestMethod
          ? `Créditos nuevos con ${INTEREST_METHOD_LABEL[updated.interestMethod]}`
          : 'Cargos guardados',
      );
    },
    onError: (error) => notifyError(error),
  });
  const s = settings.data;

  return (
    <Stack>
      <PageHeader
        title="Configuración de créditos"
        description="Cómo se calculan las cuotas y qué cargos tienen los préstamos nuevos"
      />
      {settings.isLoading && <Skeleton h={160} />}
      {s && (
        <>
          <Card withBorder padding="md">
            <Radio.Group
              label="Método de interés"
              value={s.interestMethod}
              onChange={(v) => save.mutate({ ...s, interestMethod: v as InterestMethod })}
            >
              <Stack gap="sm" mt="xs">
                {(Object.keys(INTEREST_METHOD_LABEL) as InterestMethod[]).map((m) => (
                  <Radio
                    key={m}
                    value={m}
                    label={INTEREST_METHOD_LABEL[m]}
                    description={HELP[m]}
                    disabled={save.isPending}
                  />
                ))}
              </Stack>
            </Radio.Group>
          </Card>
          <ChargesCard
            key={s.updatedAt ?? 'inicial'}
            current={s}
            saving={save.isPending}
            onSave={(values) => save.mutate(values)}
          />
          <Text size="xs" c="dimmed">
            Los préstamos ya pedidos no cambian.
            {s.updatedAt &&
              ` Último cambio: ${formatDateTime(s.updatedAt)}${s.updatedByName ? ` · ${s.updatedByName}` : ''}.`}
          </Text>
        </>
      )}
    </Stack>
  );
}

/** Papeleria y mora: opcionales, apagados por defecto. */
function ChargesCard({
  current,
  saving,
  onSave,
}: {
  current: LendingSettings;
  saving: boolean;
  onSave: (values: Values) => void;
}) {
  const [v, setV] = useState<Values>({
    interestMethod: current.interestMethod,
    paperworkFeeEnabled: current.paperworkFeeEnabled,
    paperworkFee: current.paperworkFee,
    lateFeeEnabled: current.lateFeeEnabled,
    lateFeeDailyRate: current.lateFeeDailyRate,
  });
  const changed =
    v.paperworkFeeEnabled !== current.paperworkFeeEnabled ||
    v.paperworkFee !== current.paperworkFee ||
    v.lateFeeEnabled !== current.lateFeeEnabled ||
    v.lateFeeDailyRate !== current.lateFeeDailyRate;

  return (
    <Card withBorder padding="md">
      <Stack gap="md">
        <Text fw={700}>Cargos opcionales</Text>
        <Stack gap={6}>
          <Switch
            label="Cobrar papelería"
            description="Monto fijo que se descuenta de lo que se le transfiere al cliente"
            checked={v.paperworkFeeEnabled}
            onChange={(e) => setV({ ...v, paperworkFeeEnabled: e.currentTarget.checked })}
          />
          {v.paperworkFeeEnabled && (
            <NumberInput
              label="Papelería"
              prefix="$ "
              thousandSeparator="."
              decimalSeparator=","
              min={0}
              value={v.paperworkFee}
              onChange={(x) => setV({ ...v, paperworkFee: typeof x === 'number' ? x : 0 })}
            />
          )}
        </Stack>
        <Stack gap={6}>
          <Switch
            label="Recargo por mora"
            description="Por cada día de atraso, un porcentaje de la cuota (con tope en la cuota). Se cobra al completarla."
            checked={v.lateFeeEnabled}
            onChange={(e) => setV({ ...v, lateFeeEnabled: e.currentTarget.checked })}
          />
          {v.lateFeeEnabled && (
            <NumberInput
              label="Mora por día (%)"
              suffix=" %"
              decimalSeparator=","
              min={0}
              max={10}
              decimalScale={3}
              value={Number((v.lateFeeDailyRate * 100).toFixed(3))}
              onChange={(x) =>
                setV({ ...v, lateFeeDailyRate: (typeof x === 'number' ? x : 0) / 100 })
              }
            />
          )}
        </Stack>
        <Group justify="flex-end">
          <Button
            disabled={!changed}
            loading={saving}
            onClick={() => onSave({ ...v, interestMethod: current.interestMethod })}
          >
            Guardar cargos
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
