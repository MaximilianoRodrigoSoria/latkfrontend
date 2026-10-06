import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { driver } from 'driver.js';
import type { SessionUser } from '../../auth/jwt';
import { Permission } from '../../auth/permissions';
import { tourTips, useGuidedTour, visibleTourSteps } from './useGuidedTour';

vi.mock('driver.js', () => ({ driver: vi.fn(() => ({ drive: vi.fn(), destroy: vi.fn() })) }));
const user = (permissions: string[] = [], roles = ['SELLER']): SessionUser => ({
  userId: 'demo',
  username: 'demo',
  fullName: 'Demo',
  expiresAt: 0,
  roles,
  permissions,
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  document.body.replaceChildren();
});

describe('guided help', () => {
  it('only explains management actions to accounts with permission', () => {
    expect(tourTips('/loans', user()).some((tip) => tip.title === 'Revisar solicitudes')).toBe(
      false,
    );
    expect(
      tourTips('/loans', user([Permission.LOAN_APPROVE], ['ADMIN'])).some(
        (tip) => tip.title === 'Revisar solicitudes',
      ),
    ).toBe(true);
    expect(tourTips('/customers', user()).some((tip) => tip.title === 'Nuevo cliente')).toBe(false);
    expect(
      tourTips('/customers', user([Permission.CUSTOMER_CREATE])).some(
        (tip) => tip.title === 'Nuevo cliente',
      ),
    ).toBe(true);
  });

  it('does not offer payment registration to read-only accounts', () => {
    expect(tourTips('/loans/123', user()).some((tip) => tip.title === 'Registrar un cobro')).toBe(
      false,
    );
    expect(
      tourTips('/loans/123', user([Permission.COLLECTION_REGISTER])).some(
        (tip) => tip.title === 'Registrar un cobro',
      ),
    ).toBe(true);
  });

  it('picks the visible navigation and skips absent or hidden targets', () => {
    const hidden = document.createElement('nav');
    hidden.dataset.tour = 'navigation';
    const visible = document.createElement('nav');
    visible.dataset.tour = 'navigation';
    vi.spyOn(visible, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    vi.spyOn(visible, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 320, 60));
    document.body.append(hidden, visible);
    const steps = visibleTourSteps(tourTips('/customers', user()));
    expect(steps.find((step) => step.popover?.title === 'Tus secciones')?.element).toBe(visible);
    expect(steps.some((step) => step.popover?.title === 'Actualizar el listado')).toBe(false);
    expect(steps[0]!.element).toBeUndefined();
  });

  it('waits for the menu to close, uses Spanish and blocks target actions', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useGuidedTour('/loans', user()));
    act(() => result.current());
    expect(driver).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(180));
    expect(driver).toHaveBeenCalledWith(
      expect.objectContaining({
        nextBtnText: 'Siguiente',
        doneBtnText: 'Terminar',
        disableActiveInteraction: true,
      }),
    );
    const instance = vi.mocked(driver).mock.results[0]!.value;
    expect(instance.drive).toHaveBeenCalledOnce();
    unmount();
    expect(instance.destroy).toHaveBeenCalledOnce();
  });

  it('cancels pending guides when navigating away', () => {
    vi.useFakeTimers();
    const session = user();
    const { result, rerender } = renderHook(({ path }) => useGuidedTour(path, session), {
      initialProps: { path: '/loans' },
    });
    act(() => result.current());
    rerender({ path: '/customers' });
    act(() => vi.advanceTimersByTime(500));
    expect(driver).not.toHaveBeenCalled();
  });

  it('destroys the running guide when changing accounts', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ session }) => useGuidedTour('/loans', session), {
      initialProps: { session: user() },
    });
    act(() => {
      result.current();
      vi.advanceTimersByTime(180);
    });
    const instance = vi.mocked(driver).mock.results[0]!.value;
    rerender({ session: { ...user(), userId: 'another' } });
    expect(instance.destroy).toHaveBeenCalledOnce();
  });
});
