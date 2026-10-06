import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

/** Parametro con el que el "+" de la barra inferior pide abrir el alta de la pantalla actual. */
export const NEW_PARAM = 'nuevo';

/**
 * Abre el formulario de alta cuando la URL trae ?nuevo=1 (lo pone el "+" de la barra inferior) y
 * limpia el parametro, para que volver atras o recargar no lo reabra.
 */
export function useOpenFromQuery(open: () => void, enabled = true) {
  const [params, setParams] = useSearchParams();
  const requested = params.has(NEW_PARAM);
  useEffect(() => {
    if (!enabled || !requested) return;
    open();
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(NEW_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [enabled, requested, open, setParams]);
}
