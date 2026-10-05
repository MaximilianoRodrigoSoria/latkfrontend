import {
  Alert,
  Anchor,
  Button,
  Card,
  Chip,
  Divider,
  Group,
  Modal,
  ScrollArea,
  Select,
  Skeleton,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowLeft, IconInfoCircle, IconSend } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import { PageHeader } from '../../shared/components/PageHeader';
import { FREQUENCY_LABEL, formatMoneyShort, PERIOD_LABEL } from '../../shared/format';
import { notifyError, notifySuccess } from '../../shared/notify';
import {
  amountsOf,
  EMPTY_DRAFT,
  installmentOptions,
  isComplete,
  isOpen,
  reconcile,
  selectedOption,
  type LoanDraft,
} from './loanDraft';

/**
 * Solicitud de prestamo del vendedor: cliente -> producto -> monto -> cuotas. Los valores salen de
 * las ofertas (mismo calculo y redondeo que el backend); el backend vuelve a validar todo.
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

  const customers = useQuery({
    queryKey: queryKeys.customers(''),
    queryFn: () => api.customers(''),
  });
  const loans = useQuery({ queryKey: queryKeys.loans, queryFn: api.loans });
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
  const chosen = selectedOption(offer, draft);
  const customer = customers.data?.find((c) => c.id === draft.customerId);

  const update = (patch: Partial<LoanDraft>) =>
    setDraft((d) => reconcile(offers.data ?? [], { ...d, ...patch }));

  const create = useMutation({
    mutationFn: api.createLoan,
    onSuccess: (loan) => {
      notifySuccess(
        loan.status === 'APPROVED'
          ? `Préstamo de ${loan.customerName} aprobado automáticamente.`
          : `Solicitud enviada para ${loan.customerName}. Queda pendiente de aprobación.`,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.loans });
      navigate(`/loans/${loan.id}`, { replace: true });
    },
    onError: (error) => {
      cancel();
      notifyError(error);
    },
  });

  const submit = () => {
    if (!isComplete(draft)) return;
    create.mutate({
      customerId: draft.customerId!,
      productId: draft.productId!,
      amount: draft.amount!,
      installments: draft.installments!,
      notes: notes.trim() || null,
    });
  };

  const loading = customers.isLoading || offers.isLoading;

  return (
    <Stack pb="xl">
      <Anchor component={Link} to="/loans" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} /> Préstamos
        </Group>
      </Anchor>
      <PageHeader
        title="Nuevo préstamo"
        description="Los montos chicos se aprueban solos; los grandes los aprueba el administrador"
      />

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

          <Step n={2} title="Producto">
            <ScrollArea type="never">
              <Chip.Group
                value={draft.productId ?? ''}
                onChange={(value) => update({ productId: value as string })}
              >
                <Group gap="xs" wrap="nowrap">
                  {offers.data?.map((o) => (
                    <Chip key={o.productId} value={o.productId}>
                      {o.productName} · {FREQUENCY_LABEL[o.frequency]}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            </ScrollArea>
            {offers.data?.length === 0 && (
              <Text size="sm" c="dimmed">
                No hay productos disponibles hoy.
              </Text>
            )}
          </Step>

          {offer && (
            <Step n={3} title="¿Cuánto prestás?">
              <ScrollArea type="never">
                <Chip.Group
                  value={draft.amount === null ? '' : String(draft.amount)}
                  onChange={(value) => update({ amount: Number(value) })}
                >
                  <Group gap="xs" wrap="nowrap">
                    {amountsOf(offer).map((amount) => (
                      <Chip key={amount} value={String(amount)} size="md">
                        {formatMoneyShort(amount)}
                      </Chip>
                    ))}
                  </Group>
                </Chip.Group>
              </ScrollArea>
            </Step>
          )}

          {offer && draft.amount !== null && (
            <Step n={4} title="Cuotas">
              <Chip.Group
                value={draft.installments === null ? '' : String(draft.installments)}
                onChange={(value) => update({ installments: Number(value) })}
              >
                <Stack gap="xs">
                  {installmentOptions(offer, draft.amount).map((o) => (
                    <Chip key={o.installments} value={String(o.installments)} size="md">
                      {o.installments} cuotas de {formatMoneyShort(o.installmentAmount)}
                    </Chip>
                  ))}
                </Stack>
              </Chip.Group>
            </Step>
          )}

          {offer && chosen && (
            <Card withBorder padding="md" bg="var(--mantine-color-default-hover)">
              <Text fw={700} mb="xs">
                Resumen
              </Text>
              <Summary
                label="Cliente"
                value={customer?.fullName ?? <Text c="red">Elegí un cliente</Text>}
              />
              <Summary label="Prestás" value={formatMoneyShort(chosen.amount)} />
              <Summary
                label="Cuotas"
                value={`${chosen.installments} ${PERIOD_LABEL[offer.frequency]}es de ${formatMoneyShort(chosen.installmentAmount)}`}
              />
              <Divider my="xs" />
              <Summary
                label="Total a devolver"
                value={formatMoneyShort(chosen.totalToRepay)}
                strong
              />
            </Card>
          )}

          <Textarea
            label="Notas para el administrador (opcional)"
            placeholder="Ej.: cobra los viernes"
            autosize
            minRows={2}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
          />

          <Button
            size="md"
            fullWidth
            leftSection={<IconSend size={18} />}
            disabled={!isComplete(draft) || !chosen}
            onClick={confirm}
          >
            Solicitar préstamo
          </Button>
        </>
      )}

      <Modal opened={confirming} onClose={cancel} title="Confirmar solicitud" centered>
        {chosen && offer && (
          <Stack>
            <Text size="sm">
              Vas a solicitar <b>{formatMoneyShort(chosen.amount)}</b> para{' '}
              <b>{customer?.fullName}</b> en {chosen.installments} cuotas{' '}
              {PERIOD_LABEL[offer.frequency]}es de{' '}
              <b>{formatMoneyShort(chosen.installmentAmount)}</b>.
            </Text>
            <Text size="sm" c="dimmed">
              Si el monto supera el límite de aprobación automática, el administrador la revisa
              antes de transferir el dinero al cliente.
            </Text>
            <Group grow>
              <Button variant="default" onClick={cancel} disabled={create.isPending}>
                Volver
              </Button>
              <Button onClick={submit} loading={create.isPending}>
                Confirmar
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

function Summary({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size={strong ? 'lg' : 'sm'} fw={strong ? 800 : 500} ta="right" component="div">
        {value}
      </Text>
    </Group>
  );
}
