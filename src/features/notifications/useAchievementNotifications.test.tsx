import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Quota } from '../../api/types';
import { notify } from '../../shared/notify';
import { useNotificationPreferences } from './notificationPreferences';
import { useAchievementNotifications } from './useAchievementNotifications';

vi.mock('../../shared/notify', () => ({ notify: vi.fn() }));
const quota: Quota = {
  sellerId: 'seller',
  month: '2026-10',
  assigned: 100,
  extraAllowance: 10,
  lent: 100,
  remaining: 0,
  extraRemaining: 10,
  lentPercent: 100,
  loans: 1,
  toRepay: 120,
  repaid: 0,
  full: true,
  usingExtra: false,
  fullyRepaid: false,
};
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  useNotificationPreferences.setState({ achievements: true, sound: false });
});

it('celebra una vez y no repite al volver a Inicio', async () => {
  const first = renderHook(() => useAchievementNotifications(quota));
  await waitFor(() => expect(notify).toHaveBeenCalledTimes(1));
  first.unmount();
  renderHook(() => useAchievementNotifications({ ...quota }));
  expect(notify).toHaveBeenCalledTimes(1);
});

it('respeta la desactivación sin acumular celebraciones pendientes', () => {
  useNotificationPreferences.setState({ achievements: false });
  const first = renderHook(() => useAchievementNotifications(quota));
  first.unmount();
  useNotificationPreferences.setState({ achievements: true });
  renderHook(() => useAchievementNotifications(quota));
  expect(notify).not.toHaveBeenCalled();
});

it('no celebra una cartera vacía y distingue mes y cobranza completa', async () => {
  const hook = renderHook(({ value }) => useAchievementNotifications(value), {
    initialProps: { value: { ...quota, assigned: 0, toRepay: 0, fullyRepaid: true } },
  });
  expect(notify).not.toHaveBeenCalled();
  hook.rerender({ value: { ...quota, fullyRepaid: true, repaid: 120 } });
  await waitFor(() => expect(notify).toHaveBeenCalledTimes(2));
  hook.rerender({ value: { ...quota, month: '2026-11', fullyRepaid: false } });
  await waitFor(() => expect(notify).toHaveBeenCalledTimes(3));
});
