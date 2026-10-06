import { Box, Button, Divider, Group, Modal, Stack, Text } from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';
import { useRef } from 'react';
import type { InstallmentResponse, LoanResponse } from '../../api/types';
import { formatDateTime, formatMoney } from '../../shared/format';
import { ShareButton } from '../../shared/share/ShareButton';
import { useAuthStore } from '../../auth/authStore';
import type { PendingCollection } from './offlineCollections';
import {
  provisionalReceiptData,
  receiptData,
  receiptMessage,
  type PartialPayment,
  type ReceiptData,
} from './receipt';

/**
 * Recibo de una cuota cobrada (por ejemplo en efectivo, en persona): para mandarlo por WhatsApp o
 * imprimirlo. Los datos salen del prestamo; el numero de recibo es fijo para esa cuota.
 */
export function ReceiptModal({
  loan,
  row,
  partial,
  pending,
  onClose,
}: {
  loan: LoanResponse;
  row: InstallmentResponse | null;
  /** Recibo de un abono parcial (la cuota sigue pendiente). */
  partial?: PartialPayment;
  /** Cobro sin conexion todavia no enviado: recibo provisorio. */
  pending?: PendingCollection;
  onClose: () => void;
}) {
  const ticket = useRef<HTMLDivElement>(null);
  const collector = useAuthStore((s) => s.user?.fullName ?? loan.sellerName);
  const data = row
    ? pending
      ? provisionalReceiptData(loan, row, pending, collector)
      : receiptData(loan, row, partial)
    : null;

  return (
    <Modal opened={row !== null} onClose={onClose} title="Recibo de pago" centered>
      {data && (
        <Stack>
          <div ref={ticket}>
            <ReceiptTicket data={data} />
          </div>
          <Group grow>
            <ShareButton title={`Recibo ${data.number}`} text={() => receiptMessage(data)} />
            <Button
              variant="default"
              leftSection={<IconPrinter size={18} />}
              onClick={() => printHtml(ticket.current?.innerHTML ?? '', data.number)}
            >
              Imprimir
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

/** El recibo con aspecto de ticket. Estilos en linea: se imprime tal cual fuera de la app. */
export function ReceiptTicket({ data }: { data: ReceiptData }) {
  const row = (label: string, value: string) => (
    <Group justify="space-between" wrap="nowrap" gap="xs" style={{ fontSize: 13 }}>
      <Text size="sm" c="dimmed" style={{ color: '#555' }}>
        {label}
      </Text>
      <Text size="sm" fw={600} ta="right" style={{ color: '#111' }}>
        {value}
      </Text>
    </Group>
  );
  return (
    <Box
      p="md"
      style={{
        background: '#fff',
        color: '#111',
        border: '1.5px dashed #9aa4b2',
        borderRadius: 12,
        fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text fw={900} size="lg" style={{ color: '#111', letterSpacing: 0.5 }}>
            L.A TK
          </Text>
          <Text size="xs" style={{ color: '#555' }}>
            {data.provisional ? 'Recibo provisorio' : 'Recibo de pago'}
          </Text>
        </div>
        <Text size="sm" fw={700} style={{ color: '#111' }}>
          {data.number}
        </Text>
      </Group>
      {data.provisional && (
        <Text
          size="xs"
          fw={700}
          ta="center"
          mt="xs"
          p={4}
          style={{ color: '#9a3412', background: '#ffedd5', borderRadius: 6 }}
        >
          PENDIENTE DE CONFIRMAR · se registra cuando vuelva la señal
        </Text>
      )}
      <Divider my="sm" variant="dashed" />
      <Text size="sm" style={{ color: '#111' }}>
        Recibimos de <b>{data.customerName}</b>
        {data.customerDni ? ` (DNI ${data.customerDni})` : ''} la suma de:
      </Text>
      <Text fw={900} style={{ fontSize: 28, color: '#111', lineHeight: 1.2 }} my={4}>
        {formatMoney(data.amount)}
      </Text>
      <Text size="xs" fs="italic" style={{ color: '#555' }}>
        {data.amountInWords}
      </Text>
      <Divider my="sm" variant="dashed" />
      <Stack gap={4}>
        {row(
          'Concepto',
          data.partialRemaining != null
            ? `Abono parcial · cuota ${data.installment} de ${data.installments}`
            : `Cuota ${data.installment} de ${data.installments}`,
        )}
        {data.partialRemaining != null &&
          row('Resta de la cuota', formatMoney(data.partialRemaining))}
        {data.lateFee != null && row('Recargo por mora', formatMoney(data.lateFee))}
        {row('Préstamo', `${data.product} · Nº ${data.loanRef}`)}
        {data.collectedAt && row('Fecha de cobro', formatDateTime(data.collectedAt))}
        {row('Cobró', data.collector)}
        {row(
          'Saldo pendiente',
          data.remaining.installments > 0
            ? `${formatMoney(data.remaining.amount)} (${data.remaining.installments} cuota${data.remaining.installments === 1 ? '' : 's'})`
            : 'Cancelado',
        )}
      </Stack>
      <Divider my="sm" variant="dashed" />
      <Text size="xs" ta="center" style={{ color: '#555' }}>
        Gracias por tu pago. Guardá este comprobante.
      </Text>
    </Box>
  );
}

/**
 * Imprime solo el recibo: un iframe oculto con su HTML y los estilos de la pagina (asi no se
 * imprime la app entera y no hace falta abrir otra ventana).
 */
function printHtml(html: string, title: string) {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return;
  }
  const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')]
    .map((node) => node.outerHTML)
    .join('');
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${styles}` +
      '<style>body{margin:16px;background:#fff}@page{margin:12mm}</style></head>' +
      `<body><div style="max-width:380px;margin:0 auto">${html}</div></body></html>`,
  );
  doc.close();
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 1000);
  }, 300);
}
