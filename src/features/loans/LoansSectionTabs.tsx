import { SegmentedControl } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router';
import { useAuthStore } from '../../auth/authStore';
import { hasPermission, Permission } from '../../auth/permissions';

/**
 * Pestanas de la seccion Prestamos: la lista, el simulador y los productos en un solo lugar, para
 * no repetir accesos en Inicio ni en la barra.
 */
export function LoansSectionTabs() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = [
    { value: '/loans', label: 'Préstamos' },
    ...(hasPermission(user, Permission.LOAN_SIMULATE)
      ? [{ value: '/simulator', label: 'Simulador' }]
      : []),
    ...(hasPermission(user, Permission.PRODUCT_READ)
      ? [{ value: '/products', label: 'Productos' }]
      : []),
  ];
  if (tabs.length < 2) return null;
  const current = tabs.find((t) => pathname.startsWith(t.value))?.value ?? '/loans';

  return (
    <SegmentedControl
      fullWidth
      radius="xl"
      data={tabs}
      value={current}
      onChange={(to) => navigate(to)}
      aria-label="Secciones de préstamos"
    />
  );
}
