import { useEffect } from 'react';
import { useLocalStorage } from '@mantine/hooks';
import type { Quota } from '../../api/types';
import { notify } from '../../shared/notify';
import { playAchievementSound, useNotificationPreferences } from './notificationPreferences';

export function useAchievementNotifications(quota?: Quota) {
  const [seen, setSeen] = useLocalStorage<string[]>({
    key: 'latk-achievements',
    defaultValue: [],
    getInitialValueInEffect: false,
  });
  const enabled = useNotificationPreferences((s) => s.achievements);
  useEffect(() => {
    if (!quota) return;
    const milestones = [
      {
        reached: quota.assigned > 0 && quota.full,
        key: 'goal',
        title: '¡Objetivo cumplido!',
        message: 'Completaste tu objetivo de préstamos del mes. ¡Lo lograste!',
      },
      {
        reached: quota.toRepay > 0 && quota.fullyRepaid,
        key: 'repaid',
        title: '¡Todo cobrado!',
        message: 'Cobraste todo lo prestado en el mes. Todo está al día.',
      },
    ];
    const fresh = milestones.filter(
      (m) => m.reached && !seen.includes(`${quota.sellerId}:${quota.month}:${m.key}`),
    );
    if (!fresh.length) return;
    setSeen([...seen, ...fresh.map((m) => `${quota.sellerId}:${quota.month}:${m.key}`)]);
    if (!enabled) return;
    fresh.forEach((m) =>
      notify({
        tone: 'success',
        title: m.title,
        message: m.message,
        id: `achievement:${quota.sellerId}:${quota.month}:${m.key}`,
        autoClose: 7000,
      }),
    );
    playAchievementSound();
  }, [quota, seen, setSeen, enabled]);
}
