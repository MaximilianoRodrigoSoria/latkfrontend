import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import type { ProductOffer } from '../../api/types';

/** Tiempo que la ganancia queda visible antes de volver a ocultarse. */
export const EARNINGS_VISIBLE_MS = 60_000;

/**
 * Ganancias reveladas con contrasena. Viven solo en memoria del componente: no van al cache de
 * TanStack Query ni al almacenamiento local, y se ocultan solas al minuto o al salir de la pantalla.
 */
export function useEarnings() {
  const [earnings, setEarnings] = useState<Map<string, ProductOffer> | null>(null);

  const reveal = useMutation({
    mutationFn: api.offersWithCommission,
    onSuccess: (offers) => setEarnings(new Map(offers.map((o) => [o.productId, o]))),
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

  return {
    earnings,
    reveal,
    hide: () => setEarnings(null),
  };
}
