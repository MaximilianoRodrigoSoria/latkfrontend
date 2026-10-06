import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Center,
  Loader,
  Group,
  Menu,
  NavLink as MantineNavLink,
  Stack,
  Text,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconCheck,
  IconHelp,
  IconDeviceMobileDown,
  IconTextSize,
  IconLogout,
  IconMoon,
  IconSun,
  IconPlus,
  IconUserPlus,
  IconSwitchHorizontal,
} from '@tabler/icons-react';
import { useGuidedTour } from '../shared/help/useGuidedTour';
import { OfflineSync } from '../features/loans/OfflineSync';
import { motion } from 'motion/react';
import { PageMotion } from '../shared/components/MobileMotion';
import { Suspense, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { otherAccounts, useAuthStore } from '../auth/authStore';
import {
  hasAnyPermission,
  hasPermission,
  Permission,
  isSeller,
  roleLabel,
} from '../auth/permissions';
import { NotificationBell } from '../features/notifications/NotificationBell';
import { BrandMark } from '../shared/components/BrandMark';
import { useInstallApp } from '../shared/install/InstallApp';
import { setNotifyNavigator } from '../shared/notify';
import { useFontSize } from '../shared/fontSize';
import { NAV_ITEMS } from './navigation';

const HEADER_HEIGHT = 56;
const BOTTOM_NAV_HEIGHT = 96;

/**
 * Mobile-first: en celular, barra inferior con las secciones (al alcance del pulgar); desde 48em
 * (tablet/escritorio), menu lateral. La barra inferior no existe en escritorio.
 */
export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const switchAccount = useAuthStore((s) => s.switchAccount);
  // Se calcula aca (no en el selector) para no crear un arreglo nuevo en cada lectura del store.
  const accounts = useAuthStore((s) => s.accounts);
  const others = otherAccounts({ accounts, user });
  const navigate = useNavigate();
  const location = useLocation();
  const startTour = useGuidedTour(location.pathname, user);
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light');

  const items = NAV_ITEMS.filter(
    (item) =>
      (!item.permissions || hasAnyPermission(user, item.permissions)) &&
      (!item.sellerOnly || isSeller(user)),
  );
  // Los avisos emergentes con link navegan con el router (sin recargar la app).
  useEffect(() => {
    setNotifyNavigator((to) => void navigate(to));
    return () => setNotifyNavigator(null);
  }, [navigate]);

  const installApp = useInstallApp();
  const fontSize = useFontSize((s) => s.size);
  const toggleFontSize = useFontSize((s) => s.toggle);
  const barItems = items.filter((item) => !item.menuOnly);
  // El "+" de la barra inferior depende de la pantalla: en Vendedores, Clientes y Productos da de
  // alta en esa pantalla (sin un boton flotante aparte); en el resto, pide un prestamo.
  const dockAction = quickAction(location.pathname, user);
  const menuItems = items.filter((item) => item.menuOnly);
  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    const item = items.find((i) => i.to === to);
    return [to, ...(item?.matches ?? [])].some((path) => location.pathname.startsWith(path));
  };

  const logout = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  /** Cambia la cuenta SOLO en esta pestaña; las demas siguen con la suya. */
  const switchTo = (userId: string) => {
    switchAccount(userId);
    navigate('/', { replace: true });
  };

  return (
    <AppShell
      header={{ height: HEADER_HEIGHT }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: true } }}
      footer={{ height: { base: BOTTOM_NAV_HEIGHT, sm: 0 } }}
      padding="md"
    >
      {installApp.helpModal}
      <AppShell.Header className="latk-safe-top">
        <Group h={HEADER_HEIGHT} px="md" justify="space-between" wrap="nowrap">
          <BrandMark size={28} />
          <Group gap="xs" wrap="nowrap">
            <OfflineSync />
            <NotificationBell />
            <ActionIcon
              variant="subtle"
              size="lg"
              aria-label="Cambiar modo claro/oscuro"
              onClick={() => setColorScheme(scheme === 'dark' ? 'light' : 'dark')}
            >
              {scheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
            </ActionIcon>
            <Menu position="bottom-end" width={240}>
              <Menu.Target>
                <UnstyledButton aria-label="Menu de usuario" data-tour="account">
                  <Avatar color="brand" radius="xl" size={34}>
                    {(user?.fullName ?? '?').slice(0, 1).toUpperCase()}
                  </Avatar>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Stack gap={2} px="sm" py="xs">
                  <Text fw={600} size="sm">
                    {user?.fullName}
                  </Text>
                  <Badge variant="light" size="sm">
                    {roleLabel(user)}
                  </Badge>
                </Stack>
                <Menu.Divider />
                <Menu.Item leftSection={<IconHelp size={16} />} onClick={startTour}>
                  Guía de esta pantalla
                </Menu.Item>
                {menuItems.map((item) => (
                  <Menu.Item
                    key={item.to}
                    leftSection={<item.icon size={16} />}
                    onClick={() => navigate(item.to)}
                  >
                    {item.label}
                  </Menu.Item>
                ))}
                <Menu.Item
                  leftSection={<IconTextSize size={16} />}
                  rightSection={fontSize === 'large' ? <IconCheck size={16} /> : undefined}
                  closeMenuOnClick={false}
                  onClick={toggleFontSize}
                >
                  Letra grande
                </Menu.Item>
                {installApp.available && (
                  <Menu.Item
                    leftSection={<IconDeviceMobileDown size={16} />}
                    onClick={() => void installApp.install()}
                  >
                    Instalar app
                  </Menu.Item>
                )}
                <Menu.Divider />
                <Menu.Label>Cuentas</Menu.Label>
                {others.map((account) => (
                  <Menu.Item
                    key={account.user.userId}
                    leftSection={<IconSwitchHorizontal size={16} />}
                    onClick={() => switchTo(account.user.userId)}
                  >
                    <Text size="sm" lh={1.2}>
                      {account.user.fullName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {roleLabel(account.user)}
                    </Text>
                  </Menu.Item>
                ))}
                <Menu.Item
                  leftSection={<IconUserPlus size={16} />}
                  onClick={() => navigate('/login?add=1')}
                >
                  Agregar otra cuenta
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={logout}>
                  Cerrar sesión de {user?.username}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" data-tour="navigation">
        {items.map((item) => (
          <MantineNavLink
            key={item.to}
            component={NavLink}
            to={item.to}
            label={item.label}
            leftSection={<item.icon size={20} />}
            active={isActive(item.to)}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Suspense
          fallback={
            <Center py="xl">
              <Loader />
            </Center>
          }
        >
          <PageMotion path={location.pathname}>
            <Outlet />
          </PageMotion>
        </Suspense>
      </AppShell.Main>

      <AppShell.Footer hiddenFrom="sm" className="latk-bottom-nav">
        <nav className="latk-mobile-dock" aria-label="Navegación principal" data-tour="navigation">
          {barItems.flatMap((item, index) => {
            const active = isActive(item.to);
            const link = (
              <UnstyledButton
                key={item.to}
                component={NavLink}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className="latk-dock-link"
              >
                {active && (
                  <motion.span
                    className="latk-dock-indicator"
                    layoutId="dock-indicator"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Stack gap={4} align="center" py={6} c={active ? 'brand' : 'dimmed'}>
                  <item.icon size={24} stroke={active ? 2.2 : 1.6} />
                  <Text size="10px" fw={active ? 700 : 500}>
                    {item.label}
                  </Text>
                </Stack>
              </UnstyledButton>
            );
            return index === 1 && dockAction
              ? [
                  link,
                  <ActionIcon
                    key="quick-action"
                    data-tour="quick-action"
                    component={NavLink}
                    to={dockAction.to}
                    aria-label={dockAction.label}
                    className="latk-dock-action"
                    variant="filled"
                    color="brand"
                    radius="xl"
                    size={56}
                  >
                    <IconPlus size={26} />
                  </ActionIcon>,
                ]
              : [link];
          })}
        </nav>
      </AppShell.Footer>
    </AppShell>
  );
}

interface QuickAction {
  to: string;
  label: string;
}

/** Accion del "+" segun la pantalla y los permisos del usuario. */
export function quickAction(
  pathname: string,
  user: Parameters<typeof hasPermission>[0],
): QuickAction | null {
  const contextual: [string, string, QuickAction][] = [
    ['/sellers', Permission.SELLER_MANAGE, { to: '/sellers?nuevo=1', label: 'Nuevo vendedor' }],
    [
      '/customers',
      Permission.CUSTOMER_CREATE,
      { to: '/customers?nuevo=1', label: 'Nuevo cliente' },
    ],
    ['/products', Permission.PRODUCT_MANAGE, { to: '/products?nuevo=1', label: 'Nueva categoría' }],
  ];
  const match = contextual.find(
    ([prefix, permission]) =>
      (pathname === prefix || pathname === `${prefix}/`) && hasPermission(user, permission),
  );
  if (match) return match[2];
  return hasPermission(user, Permission.LOAN_REQUEST)
    ? { to: '/loans/new', label: 'Nuevo préstamo' }
    : null;
}
