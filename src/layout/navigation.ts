import {
  IconChartBar,
  IconBuildingBank,
  IconId,
  IconUserDollar,
  IconCash,
  IconCoin,
  IconHome,
  IconPackage,
  IconPalette,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { Permission } from '../auth/permissions';

export interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  /** Permisos aceptados (alcanza con uno); sin ninguno el item no se muestra. */
  permissions?: string[];
  /** Solo para vendedores (tienen un % de comision propio). */
  sellerOnly?: boolean;
  /** Va en el menu del usuario (y en el lateral de escritorio), no en la barra inferior. */
  menuOnly?: boolean;
}

// El simulador sale de la barra (5 items como maximo en celular); se abre desde Inicio.
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: IconHome },
  {
    to: '/customers',
    label: 'Clientes',
    icon: IconUsers,
    permissions: [Permission.LOAN_READ_OWN, Permission.LOAN_READ_ALL],
  },
  {
    to: '/loans',
    label: 'Préstamos',
    icon: IconCash,
    permissions: [Permission.LOAN_READ_OWN, Permission.LOAN_READ_ALL],
  },
  {
    to: '/earnings',
    label: 'Ganancias',
    icon: IconCoin,
    permissions: [Permission.COMMISSION_READ_OWN],
    sellerOnly: true,
  },
  {
    to: '/sellers',
    label: 'Vendedores',
    icon: IconUserDollar,
    permissions: [Permission.SELLER_MANAGE],
  },
  {
    to: '/products',
    label: 'Productos',
    icon: IconPackage,
    permissions: [Permission.PRODUCT_READ],
  },
  {
    to: '/stats',
    label: 'Estadísticas',
    icon: IconChartBar,
    permissions: [Permission.DASHBOARD_READ],
    menuOnly: true,
  },
  {
    to: '/profile',
    label: 'Mis datos',
    icon: IconId,
    permissions: [Permission.PROFILE_MANAGE_OWN],
    menuOnly: true,
  },
  {
    to: '/settings/collection-account',
    label: 'Cuenta para rendiciones',
    icon: IconBuildingBank,
    permissions: [Permission.PARAMETER_MANAGE],
    menuOnly: true,
  },
  {
    to: '/settings/theme',
    label: 'Tema',
    icon: IconPalette,
    permissions: [Permission.PARAMETER_MANAGE],
    menuOnly: true,
  },
];
