import { Notifications } from '@mantine/notifications';
import { useMediaQuery } from '@mantine/hooks';

/**
 * Donde aparecen los avisos: arriba al centro en el celular (no tapa la barra inferior ni el pulgar)
 * y arriba a la derecha en escritorio. Como mucho 4 a la vez; el resto espera en cola.
 */
export function ToastHost() {
  const mobile = useMediaQuery('(max-width: 48em)');
  return (
    <Notifications
      position={mobile ? 'top-center' : 'top-right'}
      limit={4}
      zIndex={4000}
      containerWidth={mobile ? 360 : 400}
    />
  );
}
