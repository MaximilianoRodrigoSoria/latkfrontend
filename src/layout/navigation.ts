import { IconCalculator, IconHome, IconPackage, IconPalette, type Icon } from '@tabler/icons-react';
import { Permission } from '../auth/permissions';

export interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  /** Permiso requerido; sin permiso el item no se muestra. */
  permission?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: IconHome },
  {
    to: '/simulator',
    label: 'Simulador',
    icon: IconCalculator,
    permission: Permission.LOAN_SIMULATE,
  },
  { to: '/products', label: 'Productos', icon: IconPackage, permission: Permission.PRODUCT_READ },
  {
    to: '/settings/theme',
    label: 'Tema',
    icon: IconPalette,
    permission: Permission.PARAMETER_MANAGE,
  },
];
