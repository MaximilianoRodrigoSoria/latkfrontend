import { notifications } from '@mantine/notifications';
import { ApiError } from '../api/http';

/** Mensajes en castellano para errores genericos que el backend devuelve sin detalle propio. */
const STATUS_MESSAGES: Record<number, string> = {
  0: 'No se pudo contactar al servidor. Revisa la conexion.',
  403: 'No tenes permiso para realizar esta operacion.',
  404: 'El servidor no reconoce esta operacion. Puede que el backend no este actualizado.',
  503: 'El servicio no esta disponible. Reintenta en unos minutos.',
};

export function notifyError(error: unknown, fallback = 'Ocurrio un error inesperado') {
  if (!(error instanceof ApiError)) {
    notifications.show({ color: 'red', title: 'Error', message: fallback });
    return;
  }
  // Spring responde "Not Found"/"Not Found" en title y detail: se reemplaza por un texto util.
  const generic =
    error.message === error.title || /^[A-Z][a-z]+( [A-Z][a-z]+)*$/.test(error.message);
  const message = generic ? (STATUS_MESSAGES[error.status] ?? error.message) : error.message;
  notifications.show({ color: 'red', title: `${error.title} (${error.status})`, message });
}

export function notifySuccess(message: string) {
  notifications.show({ color: 'teal', title: 'Listo', message });
}
