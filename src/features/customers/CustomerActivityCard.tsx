import { Badge, Button, Card, Group, Skeleton, Text, ThemeIcon, Timeline } from '@mantine/core';
import {
  IconArrowBackUp,
  IconBan,
  IconBolt,
  IconCash,
  IconCheck,
  IconCircleCheck,
  IconFileText,
  IconSend,
  type Icon,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { api, queryKeys } from '../../api/endpoints';
import type { CustomerActivity, CustomerActivityType } from '../../api/types';
import { formatDateTime, formatMoneyShort } from '../../shared/format';

const PAGE = 8;

const LOOK: Record<CustomerActivityType, { color: string; icon: Icon }> = {
  LOAN_REQUESTED: { color: 'brand', icon: IconFileText },
  LOAN_AUTO_APPROVED: { color: 'teal', icon: IconBolt },
  LOAN_APPROVED: { color: 'teal', icon: IconCheck },
  LOAN_REJECTED: { color: 'red', icon: IconBan },
  LOAN_DISBURSED: { color: 'blue', icon: IconSend },
  INSTALLMENT_COLLECTED: { color: 'teal', icon: IconCash },
  INSTALLMENT_REVERTED: { color: 'orange', icon: IconArrowBackUp },
  LOAN_COMPLETED: { color: 'gray', icon: IconCircleCheck },
};

/** Titulo del hecho en castellano. */
export function activityTitle(a: CustomerActivity): string {
  const amount = a.amount != null ? ` · ${formatMoneyShort(a.amount)}` : '';
  switch (a.type) {
    case 'LOAN_REQUESTED':
      return `Préstamo solicitado${amount}`;
    case 'LOAN_AUTO_APPROVED':
      return 'Aprobado automáticamente';
    case 'LOAN_APPROVED':
      return 'Préstamo aprobado';
    case 'LOAN_REJECTED':
      return 'Préstamo rechazado';
    case 'LOAN_DISBURSED':
      return `Dinero transferido${amount}`;
    case 'INSTALLMENT_COLLECTED':
      return `Cuota ${a.installmentNumber} cobrada${a.advance ? ' (adelanto)' : ''}${amount}`;
    case 'INSTALLMENT_REVERTED':
      return `Cuota ${a.installmentNumber} vuelta a pendiente`;
    case 'LOAN_COMPLETED':
      return 'Préstamo finalizado';
  }
}

/** Etiqueta del detalle segun el hecho: motivo, referencia o notas. */
export function activityDetail(a: CustomerActivity): string | null {
  if (!a.detail) return null;
  switch (a.type) {
    case 'LOAN_DISBURSED':
      return `Referencia: ${a.detail}`;
    case 'LOAN_REQUESTED':
      return `Notas: ${a.detail}`;
    case 'LOAN_AUTO_APPROVED':
      return a.detail;
    default:
      return `Motivo: ${a.detail}`;
  }
}

/**
 * Historia del cliente: todo lo que paso con sus prestamos, quien lo hizo y cuando. Nada se borra:
 * si una cuota se marco cobrada por error y despues se corrigio, se ven los dos hechos.
 */
export function CustomerActivityCard({ customerId }: { customerId: string }) {
  const [all, setAll] = useState(false);
  const activity = useQuery({
    queryKey: queryKeys.customerActivity(customerId),
    queryFn: () => api.customerActivity(customerId),
  });
  const items = activity.data ?? [];
  const shown = all ? items : items.slice(0, PAGE);
  const corrections = items.filter((a) => a.type === 'INSTALLMENT_REVERTED').length;

  return (
    <Card withBorder padding="md">
      <Group justify="space-between" mb="sm">
        <Text fw={700}>Historial</Text>
        {corrections > 0 && (
          <Badge color="orange" variant="light">
            {corrections} correcci{corrections === 1 ? 'ón' : 'ones'}
          </Badge>
        )}
      </Group>
      {activity.isLoading && <Skeleton h={120} />}
      {activity.isError && (
        <Text size="sm" c="red">
          {activity.error.message}
        </Text>
      )}
      {activity.data && items.length === 0 && (
        <Text size="sm" c="dimmed">
          Todavía no hay movimientos.
        </Text>
      )}
      {items.length > 0 && (
        <Timeline bulletSize={26} lineWidth={2}>
          {shown.map((a, index) => {
            const look = LOOK[a.type];
            const detail = activityDetail(a);
            return (
              <Timeline.Item
                key={`${a.at}-${a.type}-${index}`}
                bullet={
                  <ThemeIcon size={26} radius="xl" variant="light" color={look.color}>
                    <look.icon size={14} />
                  </ThemeIcon>
                }
                title={
                  <Text size="sm" fw={600}>
                    {activityTitle(a)}
                  </Text>
                }
              >
                <Text size="xs" c="dimmed">
                  {formatDateTime(a.at)} · {a.actorName ?? 'Automático'}
                  {a.productName ? ' · ' : ''}
                  {a.productName && (
                    <Text span inherit component={Link} to={`/loans/${a.loanId}`} c="brand">
                      {a.productName}
                    </Text>
                  )}
                </Text>
                {detail && (
                  <Text size="sm" mt={2}>
                    {detail}
                  </Text>
                )}
              </Timeline.Item>
            );
          })}
        </Timeline>
      )}
      {items.length > PAGE && (
        <Button variant="subtle" size="xs" mt="xs" onClick={() => setAll((v) => !v)}>
          {all ? 'Ver menos' : `Ver todo (${items.length})`}
        </Button>
      )}
    </Card>
  );
}
