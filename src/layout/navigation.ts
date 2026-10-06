import {
  IconAdjustments,
  IconBuildingBank,
  IconCash,
  IconCoin,
  IconDatabaseExport,
  IconHome,
  IconId,
  IconKey,
  IconPalette,
  IconUserDollar,
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
  /** Otras rutas de la misma seccion: el item queda marcado tambien en ellas. */
  matches?: string[];
}

// Barra corta (4 items): Inicio muestra las estadisticas y Prestamos agrupa la lista, el simulador
// y los productos en pestanas.
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
    matches: ['/simulator', '/products'],
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
    to: '/profile',
    label: 'Mis datos',
    icon: IconId,
    permissions: [Permission.PROFILE_MANAGE_OWN],
    menuOnly: true,
  },
  {
    to: '/account/password',
    label: 'Cambiar contraseña',
    icon: IconKey,
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
    to: '/settings/lending',
    label: 'Configuración de créditos',
    icon: IconAdjustments,
    permissions: [Permission.LENDING_SETTINGS],
    menuOnly: true,
  },
  {
    to: '/settings/backup',
    label: 'Respaldo de datos',
    icon: IconDatabaseExport,
    permissions: [Permission.DATA_BACKUP],
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
