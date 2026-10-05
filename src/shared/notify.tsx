import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconInfoCircle,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { ApiError } from '../api/http';

/**
 * Avisos emergentes (toasts) de toda la app. Un unico punto de entrada para que todos se vean y
 * se comporten igual:
 * - tono (info, exito, aviso, error) con color e icono: nunca solo color;
 * - sin duplicados: el mismo aviso no se apila dos veces mientras esta visible;
 * - los errores quedan mas tiempo en pantalla;
 * - un aviso con `link` es clickeable y lleva a esa pantalla.
 * Cuantos se ven a la vez y donde los define `ToastHost`.
 */
export type Tone = 'info' | 'success' | 'warning' | 'error';

export interface NotifyOptions {
  tone?: Tone;
  title: string;
  message: ReactNode;
  /** Ruta interna a la que lleva al tocarlo. */
  link?: string;
  /** Identificador estable: evita mostrar dos veces lo mismo. Por defecto, tono+titulo+texto. */
  id?: string;
  /** ms; false = queda hasta que se cierre. */
  autoClose?: number | false;
}

const STYLE: Record<Tone, { color: string; icon: ReactNode; autoClose: number }> = {
  info: { color: 'brand', icon: <IconInfoCircle size={20} />, autoClose: 5000 },
  success: { color: 'teal', icon: <IconCircleCheck size={20} />, autoClose: 4000 },
  warning: { color: 'orange', icon: <IconAlertTriangle size={20} />, autoClose: 7000 },
  error: { color: 'red', icon: <IconCircleX size={20} />, autoClose: 8000 },
};

const visible = new Set<string>();
let navigate: ((to: string) => void) | null = null;

/** El layout registra la navegacion del router para que los avisos con link funcionen. */
export function setNotifyNavigator(fn: ((to: string) => void) | null) {
  navigate = fn;
}

export function notify(options: NotifyOptions): string {
  const tone = options.tone ?? 'info';
  const style = STYLE[tone];
  const id =
    options.id ??
    `${tone}:${options.title}:${typeof options.message === 'string' ? options.message : ''}`;
  if (visible.has(id)) return id;
  visible.add(id);
  const link = options.link;
  notifications.show({
    id,
    color: style.color,
    icon: style.icon,
    title: options.title,
    message: options.message,
    withBorder: true,
    autoClose: options.autoClose ?? style.autoClose,
    onClose: () => visible.delete(id),
    style: link ? { cursor: 'pointer' } : undefined,
    onClick: link
      ? () => {
          navigate?.(link);
          notifications.hide(id);
        }
      : undefined,
  });
  return id;
}

/** Mensajes en castellano para errores genericos que el backend devuelve sin detalle propio. */
const STATUS_MESSAGES: Record<number, string> = {
  0: 'No se pudo contactar al servidor. Revisá la conexión.',
  403: 'No tenés permiso para realizar esta operación.',
  404: 'El servidor no reconoce esta operación. Puede que el backend no esté actualizado.',
  503: 'El servicio no está disponible. Reintentá en unos minutos.',
};

export function notifyError(error: unknown, fallback = 'Ocurrió un error inesperado') {
  if (!(error instanceof ApiError)) {
    notify({ tone: 'error', title: 'Error', message: fallback });
    return;
  }
  // Spring responde "Not Found"/"Not Found" en title y detail: se reemplaza por un texto util.
  const generic =
    error.message === error.title || /^[A-Z][a-z]+( [A-Z][a-z]+)*$/.test(error.message);
  const message = generic ? (STATUS_MESSAGES[error.status] ?? error.message) : error.message;
  // Un conflicto (409) es un aviso, no una falla: otro usuario se adelanto o el dato ya existe.
  notify({
    tone: error.status === 409 ? 'warning' : 'error',
    title: `${error.title} (${error.status})`,
    message,
  });
}

export function notifySuccess(message: string) {
  notify({ tone: 'success', title: 'Listo', message });
}
