import { notifications } from '@mantine/notifications';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/http';
import { notify, notifyError, setNotifyNavigator } from './notify';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn(), hide: vi.fn() },
}));

const show = vi.mocked(notifications.show);
const lastCall = () => show.mock.calls.at(-1)![0];

beforeEach(() => show.mockClear());

describe('notify', () => {
  it('no apila dos veces el mismo aviso mientras esta visible', () => {
    notify({ title: 'Hola', message: 'uno', id: 'dup-test' });
    notify({ title: 'Hola', message: 'uno', id: 'dup-test' });
    expect(show).toHaveBeenCalledTimes(1);

    lastCall().onClose?.({} as never);
    notify({ title: 'Hola', message: 'uno', id: 'dup-test' });
    expect(show).toHaveBeenCalledTimes(2);
  });

  it('los errores quedan mas tiempo que los exitos', () => {
    notify({ tone: 'error', title: 'E', message: 'x', id: 'e1' });
    const error = lastCall().autoClose as number;
    notify({ tone: 'success', title: 'S', message: 'x', id: 's1' });
    expect(error).toBeGreaterThan(lastCall().autoClose as number);
  });

  it('un aviso con link navega al tocarlo', () => {
    const go = vi.fn();
    setNotifyNavigator(go);
    notify({ title: 'Prestamo', message: 'aprobado', link: '/loans/1', id: 'link-test' });
    lastCall().onClick?.({} as never);
    expect(go).toHaveBeenCalledWith('/loans/1');
    expect(notifications.hide).toHaveBeenCalledWith('link-test');
    setNotifyNavigator(null);
  });

  it('un 409 es un aviso naranja, no un error rojo', () => {
    notifyError(new ApiError({ status: 409, title: 'Conflicto', detail: 'Ya fue decidido' }));
    expect(lastCall().color).toBe('orange');
    notifyError(new ApiError({ status: 422, title: 'Regla de negocio', detail: 'Monto invalido' }));
    expect(lastCall().color).toBe('red');
  });
});
