import { Button, Group, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useRef, useState } from 'react';

/** A dedicated touch handle keeps native scrolling and form gestures intact. */
export function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<unknown> }) {
  const start = useRef<{ id: number; y: number } | null>(null);
  const running = useRef(false);
  const [distance, setDistance] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const refresh = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await onRefresh();
    } catch {
      setFailed(true);
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const reset = () => {
    start.current = null;
    setDistance(0);
  };
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <div
        className="latk-refresh-handle"
        onPointerDown={(event) => {
          if (event.pointerType !== 'touch' || running.current) return;
          start.current = { id: event.pointerId, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (start.current?.id !== event.pointerId) return;
          setDistance(Math.min(90, Math.max(0, event.clientY - start.current.y)));
        }}
        onPointerUp={(event) => {
          if (start.current?.id !== event.pointerId) return;
          const pulled = event.clientY - start.current.y >= 64;
          reset();
          if (pulled) void refresh();
        }}
        onPointerCancel={reset}
        onLostPointerCapture={reset}
      >
        <Text size="xs" c="dimmed" aria-hidden="true">
          {distance >= 64 ? 'Soltá para actualizar' : 'Arrastrá aquí para actualizar'}
        </Text>
      </div>
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconRefresh size={16} />}
        loading={busy}
        onClick={() => void refresh()}
      >
        Actualizar
      </Button>
      <span className="latk-visually-hidden" role="status">
        {busy ? 'Actualizando datos' : failed ? 'No se pudo actualizar. Intentá nuevamente.' : ''}
      </span>
    </Group>
  );
}
