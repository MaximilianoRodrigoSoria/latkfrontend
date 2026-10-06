import { Badge, Tooltip } from '@mantine/core';
import { IconCloudUpload } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { notifyError, notifySuccess } from '../../shared/notify';
import { syncOfflineCollections, useOfflineCollections } from './offlineCollections';

/**
 * Envia los cobros hechos sin señal apenas vuelve la conexion (y cada minuto por las dudas). Solo
 * se ve si hay algo pendiente: un indicador chico en la barra superior.
 */
export function OfflineSync() {
  const pending = useOfflineCollections((s) => s.pending.length);
  const queryClient = useQueryClient();

  useEffect(() => {
    let running = false;
    const run = async () => {
      if (running || useOfflineCollections.getState().pending.length === 0) return;
      running = true;
      try {
        const { sent, rejected } = await syncOfflineCollections();
        if (sent.length > 0) {
          notifySuccess(
            `${sent.length} cobro${sent.length === 1 ? '' : 's'} sin conexión enviado${sent.length === 1 ? '' : 's'}`,
          );
          void queryClient.invalidateQueries();
        }
        rejected.forEach((r) =>
          notifyError(
            new Error(`No se pudo registrar el cobro de ${r.item.customerName}: ${r.message}`),
          ),
        );
      } finally {
        running = false;
      }
    };
    void run();
    window.addEventListener('online', run);
    const timer = window.setInterval(run, 60_000);
    return () => {
      window.removeEventListener('online', run);
      window.clearInterval(timer);
    };
  }, [queryClient]);

  if (pending === 0) return null;
  return (
    <Tooltip label="Se envían solos cuando vuelve la señal">
      <Badge
        color="orange"
        variant="light"
        leftSection={<IconCloudUpload size={14} />}
        style={{ textTransform: 'none' }}
      >
        {pending} sin enviar
      </Badge>
    </Tooltip>
  );
}
