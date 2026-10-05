import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import type { EarningsResponse } from '../../api/types';
import { EARNINGS_VISIBLE_MS } from '../products/useEarnings';

/**
 * Ganancias reveladas con contrasena. Solo en memoria (ni cache ni almacenamiento local) y se
 * ocultan solas al minuto o cuando la app pasa a segundo plano.
 */
export function useMyEarnings() {
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);

  const reveal = useMutation({
    mutationFn: api.myEarnings,
    onSuccess: setEarnings,
  });

  useEffect(() => {
    if (!earnings) return;
    const timer = window.setTimeout(() => setEarnings(null), EARNINGS_VISIBLE_MS);
    const hideWhenHidden = () => document.hidden && setEarnings(null);
    document.addEventListener('visibilitychange', hideWhenHidden);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', hideWhenHidden);
    };
  }, [earnings]);

  return { earnings, reveal, hide: () => setEarnings(null) };
}
