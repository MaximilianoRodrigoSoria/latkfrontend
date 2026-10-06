import {
  Alert,
  Anchor,
  Button,
  Group,
  Modal,
  Select,
  Skeleton,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowLeft, IconInfoCircle, IconSend, IconTargetArrow } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import { ApiError } from '../../api/http';
import { useAuthStore } from '../../auth/authStore';
import { isSeller } from '../../auth/permissions';
import { monthName } from '../quota/QuotaCard';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatMoneyShort, INSTALLMENTS_LABEL } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';
import { findOption, offerLabel } from '../products/tiers';
import { EMPTY_DRAFT, isComplete, isOpen, type LoanDraft } from './loanDraft';
import { LoanPicker } from './LoanPicker';

/**
 * Solicitud de prestamo del vendedor: cliente -> categoria -> monto y cuotas con deslizadores. Los
 * valores salen de las ofertas (mismo calculo y redondeo que el backend); el backend vuelve a
 * validar todo.
 */
export function NewLoanPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<LoanDraft>({
    ...EMPTY_DRAFT,
    customerId: params.get('customerId'),
  });
  const [notes, setNotes] = useState('');
  const [confirming, { open: confirm, close: cancel }] = useDisclosure(false);
  const user = useAuthStore((s) => s.user);
  // Respuesta 409 QUOTA_EXCEEDED: supera el cupo pero entra en el margen extra.
  const [overQuota, setOverQuota] = useState<{ remaining: number; extraRemaining: number } | null>(
    null,
  );
  const quota = useQuery({
    queryKey: queryKeys.myQuota,
    queryFn: api.myQuota,
    enabled: isSeller(user),
  });

  const customers = useQuery({
    queryKey: queryKeys.customers(''),
    queryFn: () => api.customers(''),
  });
  const loans = useQuery({ queryKey: queryKeys.loans, queryFn: api.loans });
  const charges = useQuery({ queryKey: queryKeys.lendingCharges, queryFn: api.lendingCharges });
  const paperwork = charges.data?.paperworkFee ?? 0;
  const offers = useQuery({ queryKey: queryKeys.offers, queryFn: api.offers });

  const busyCustomers = useMemo(
    () => new Set(loans.data?.filter((l) => isOpen(l.status)).map((l) => l.customerId)),
    [loans.data],
  );
  const customerOptions = (customers.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.fullName} · DNI ${c.dni}${busyCustomers.has(c.id) ? ' (préstamo en curso)' : ''}`,
    disabled: busyCustomers.has(c.id),
  }));

  const offer = offers.data?.find((o) => o.productId === draft.productId);
  const chosen = findOption(offer, draft.amount, draft.installments) ?? null;
  const customer = customers.data?.find((c) => c.id === draft.customerId);

  const update = (patch: Partial<LoanDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const create = useMutation({
    mutationFn: api.createLoan,
    onSuccess: (loan) => {
      notifySuccess(
        loan.status === 'APPROVED'
          ? `Préstamo de ${loan.customerName} aprobado automáticamente.`
          : `Solicitud enviada para ${loan.customerName}. Queda pendiente de aprobación.`,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.loans });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myQuota });
      setOverQuota(null);
      navigate(`/loans/${loan.id}`, { replace: true });
    },
    onError: (error) => {
      cancel();
      if (error instanceof ApiError && error.code === 'QUOTA_EXCEEDED') {
        setOverQuota({
          remaining: Number(error.problem.remaining ?? 0),
          extraRemaining: Number(error.problem.extraRemaining ?? 0),
        });
        return;
      }
      setOverQuota(null);
      notifyError(error);
    },
  });

  const submit = (useExtraQuota = false) => {
    if (!isComplete(draft)) return;
    create.mutate({
      customerId: draft.customerId!,
      productId: draft.productId!,
      amount: draft.amount!,
      installments: draft.installments!,
      notes: notes.trim() || null,
      useExtraQuota,
    });
  };

  const loading = customers.isLoading || offers.isLoading;

  return (
    <Stack pb="xl" maw={760} w="100%" mx="auto">
      <Anchor component={Link} to="/loans" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} /> Préstamos
        </Group>
      </Anchor>
      <PageHeader
        title="Nuevo préstamo"
        description="Los montos chicos se aprueban solos; los grandes los aprueba el administrador"
      />

      {quota.data && (
        <Alert
          icon={<IconTargetArrow />}
          color={quota.data.full ? 'orange' : 'blue'}
          title={`Cupo de ${monthName(quota.data.month)}`}
        >
          {quota.data.full
            ? `Ya prestaste todo tu cupo. Margen extra disponible: ${formatMoneyShort(quota.data.extraRemaining)}.`
            : `Te quedan ${formatMoneyShort(quota.data.remaining)} de ${formatMoneyShort(quota.data.assigned)}.`}
        </Alert>
      )}

      {loading && <Skeleton h={320} />}
      {customers.data?.length === 0 && (
        <Alert icon={<IconInfoCircle />} color="yellow">
          Primero tenés que dar de alta un cliente.{' '}
          <Anchor component={Link} to="/customers">
            Ir a clientes
          </Anchor>
        </Alert>
      )}

      {!loading && (
        <>
          <Step n={1} title="Cliente">
            <Select
              placeholder="Buscá por nombre o DNI"
              searchable
              data={customerOptions}
              value={draft.customerId}
              onChange={(value) => update({ customerId: value })}
              nothingFoundMessage="Sin coincidencias"
              aria-label="Cliente"
            />
          </Step>

          <Step n={2} title="Categoría, monto y cuotas">
            {offers.data?.length === 0 ? (
              <Text size="sm" c="dimmed">
                No hay productos disponibles hoy.
              </Text>
            ) : (
              <LoanPicker
                offers={offers.data ?? []}
                value={draft}
                onChange={(choice) => update(choice)}
              />
            )}
          </Step>

          <Textarea
            label="Notas para el administrador (opcional)"
            placeholder="Ej.: cobra los viernes"
            autosize
            minRows={2}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
          />

          <Group justify="flex-end">
            <Button component={Link} to="/loans" variant="default" size="md">
              Cancelar
            </Button>
            <Button
              size="md"
              leftSection={<IconSend size={18} />}
              disabled={!isComplete(draft) || !chosen}
              onClick={confirm}
            >
              Solicitar préstamo
            </Button>
          </Group>
        </>
      )}

      <Modal opened={confirming} onClose={cancel} title="Confirmar solicitud" centered>
        {chosen && offer && (
          <Stack>
            <Text size="sm">
              Vas a solicitar <b>{formatMoneyShort(chosen.amount)}</b> ({offerLabel(offer)}) para{' '}
              <b>{customer?.fullName ?? 'el cliente'}</b> en {chosen.installments} cuotas{' '}
              {INSTALLMENTS_LABEL[offer.frequency]} de{' '}
              <b>{formatMoneyShort(chosen.installmentAmount)}</b>.
            </Text>
            {paperwork > 0 && (
              <Text size="sm">
                Gastos de papelería: <b>{formatMoneyShort(paperwork)}</b>. Se descuentan de lo que
                recibe el cliente ({formatMoneyShort(Math.max(chosen.amount - paperwork, 0))}).
              </Text>
            )}
            <Text size="sm" c="dimmed">
              Si el monto supera el límite de aprobación automática, el administrador la revisa
              antes de transferir el dinero al cliente.
            </Text>
            <Group grow>
              <Button variant="default" onClick={cancel} disabled={create.isPending}>
                Volver
              </Button>
              <Button onClick={() => submit()} loading={create.isPending}>
                Confirmar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
      <Modal
        opened={overQuota !== null}
        onClose={() => setOverQuota(null)}
        title="Superás tu cupo del mes"
        centered
      >
        {overQuota && chosen && (
          <Stack>
            <Text size="sm">
              Este préstamo de <b>{formatMoneyShort(chosen.amount)}</b> supera lo que te queda del
              cupo ({formatMoneyShort(overQuota.remaining)}).
            </Text>
            <Text size="sm">
              Podés pedirlo igual usando el <b>margen extra</b>: te quedan{' '}
              <b>{formatMoneyShort(overQuota.extraRemaining)}</b>. El administrador lo ve en tu
              cupo.
            </Text>
            <Group grow>
              <Button
                variant="default"
                onClick={() => setOverQuota(null)}
                disabled={create.isPending}
              >
                No, volver
              </Button>
              <Button color="orange" onClick={() => submit(true)} loading={create.isPending}>
                Pedir con margen extra
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Stack gap={6}>
      <Text fw={700} size="sm">
        {n}. {title}
      </Text>
      {children}
    </Stack>
  );
}
