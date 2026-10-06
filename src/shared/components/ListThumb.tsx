import type { ReactNode } from 'react';

/**
 * Cuadradito a la izquierda de una tarjeta de listado (cliente, prestamo). Muestra un icono sobre un
 * fondo suave del color dado; con {@code src} muestra la imagen (por ejemplo, la foto del cliente).
 */
export function ListThumb({
  children,
  color = 'var(--mantine-primary-color-filled)',
  src,
  alt = '',
  size = 44,
}: {
  children?: ReactNode;
  color?: string;
  src?: string | null;
  alt?: string;
  size?: number;
}) {
  return (
    <div
      aria-hidden={src ? undefined : true}
      style={{
        width: size,
        height: size,
        flex: '0 0 auto',
        borderRadius: 12,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
      }}
    >
      {src ? (
        <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        children
      )}
    </div>
  );
}
