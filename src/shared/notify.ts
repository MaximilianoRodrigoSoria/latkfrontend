import { notifications } from '@mantine/notifications';
import { ApiError } from '../api/http';

export function notifyError(error: unknown, fallback = 'Ocurrio un error inesperado') {
  const message = error instanceof ApiError ? error.message : fallback;
  const title = error instanceof ApiError ? error.title : 'Error';
  notifications.show({ color: 'red', title, message });
}

export function notifySuccess(message: string) {
  notifications.show({ color: 'teal', title: 'Listo', message });
}
