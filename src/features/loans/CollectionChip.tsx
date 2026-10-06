import { Badge } from '@mantine/core';
import type { CollectionState } from './collectionState';

const COLOR = {
  OVERDUE: 'red',
  TODAY: 'blue',
  UPCOMING: 'yellow',
  PENDING: 'gray',
  DONE: 'gray',
} as const;

export function collectionLabel(state: CollectionState, done = 'Terminado'): string {
  switch (state.kind) {
    case 'OVERDUE':
      return `Atrasado ${state.days} día${state.days === 1 ? '' : 's'}`;
    case 'TODAY':
      return 'Cobrar hoy';
    case 'UPCOMING':
      return state.days === 1 ? 'Vence mañana' : `Vence en ${state.days} días`;
    case 'PENDING':
      return 'En trámite';
    case 'DONE':
      return done;
  }
}

/** El unico chip de estado de una tarjeta. {@code done}: texto cuando todo termino. */
export function CollectionChip({ state, done }: { state: CollectionState; done?: string }) {
  return (
    <Badge
      variant={state.kind === 'OVERDUE' || state.kind === 'TODAY' ? 'filled' : 'light'}
      color={COLOR[state.kind]}
      // Nunca se recorta: si falta lugar se achica el texto de al lado.
      styles={{
        root: { textTransform: 'none', flexShrink: 0 },
        label: { overflow: 'visible', textOverflow: 'clip' },
      }}
    >
      {collectionLabel(state, done)}
    </Badge>
  );
}
