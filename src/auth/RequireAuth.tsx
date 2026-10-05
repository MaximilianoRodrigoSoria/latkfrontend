import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { getToken, useAuthStore } from './authStore';
import { hasPermission } from './permissions';

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  // Se suscribe al store para re-renderizar al cerrar sesion.
  useAuthStore((s) => s.token);
  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/** Oculta rutas sin permiso. El backend igual responde 403: esto es solo experiencia de uso. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  if (!hasPermission(user, permission)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
