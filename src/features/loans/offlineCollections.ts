import { create } from 'zustand';
import { api } from '../../api/endpoints';
import { ApiError } from '../../api/http';

/**
 * Cobros hechos sin señal: se guardan en el celular y se mandan solos al volver la conexion. Cada
 * uno lleva una referencia unica (el servidor ignora un envio repetido) y la hora real del cobro.
 */
export interface PendingCollection {
  reference: string;
  loanId: string;
  customerName: string;
  number: number;
  amount?: number;
  collectedAt: string;
}

const KEY = 'latk-offline-collections';

function load(): PendingCollection[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingCollection[]) : [];
  } catch {
    return [];
  }
}

function save(items: PendingCollection[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // sin almacenamiento: la cola vive solo en memoria
  }
}

interface OfflineState {
  pending: PendingCollection[];
  add: (item: Omit<PendingCollection, 'reference' | 'collectedAt'>) => PendingCollection;
  remove: (reference: string) => void;
}

export const useOfflineCollections = create<OfflineState>()((set, get) => ({
  pending: load(),
  add: (item) => {
    const entry: PendingCollection = {
      ...item,
      reference: crypto.randomUUID(),
      collectedAt: new Date().toISOString(),
    };
    const pending = [...get().pending, entry];
    save(pending);
    set({ pending });
    return entry;
  },
  remove: (reference) => {
    const pending = get().pending.filter((p) => p.reference !== reference);
    save(pending);
    set({ pending });
  },
}));

/** Sin conexion: el navegador lo dice, o el pedido ni llego al servidor. */
export const isOfflineError = (error: unknown) =>
  (typeof navigator !== 'undefined' && navigator.onLine === false) ||
  (error instanceof ApiError && error.status === 0);

export interface SyncResult {
  sent: PendingCollection[];
  rejected: { item: PendingCollection; message: string }[];
}

/**
 * Manda los cobros pendientes en orden. Si sigue sin conexion, corta y reintenta despues; si el
 * servidor rechaza uno (por ejemplo, otro ya cobro esa cuota), se descarta y se informa.
 */
export async function syncOfflineCollections(): Promise<SyncResult> {
  const result: SyncResult = { sent: [], rejected: [] };
  const { pending, remove } = useOfflineCollections.getState();
  for (const item of pending) {
    try {
      await api.collectInstallment(item.loanId, item.number, item.amount, {
        reference: item.reference,
        collectedAt: item.collectedAt,
      });
      remove(item.reference);
      result.sent.push(item);
    } catch (error) {
      if (isOfflineError(error)) break;
      remove(item.reference);
      result.rejected.push({
        item,
        message: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
  return result;
}
