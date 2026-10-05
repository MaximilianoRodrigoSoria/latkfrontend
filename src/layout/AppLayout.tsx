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
import { IconLogout, IconMoon, IconSun } from '@tabler/icons-react';
import { Suspense } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuthStore } from '../auth/authStore';
import { hasPermission, roleLabel } from '../auth/permissions';
import { BrandMark } from '../shared/components/BrandMark';
import { NAV_ITEMS } from './navigation';

const HEADER_HEIGHT = 56;
const BOTTOM_NAV_HEIGHT = 64;

/**
 * Mobile-first: en celular, barra inferior con las secciones (al alcance del pulgar); desde 48em
 * (tablet/escritorio), menu lateral. La barra inferior no existe en escritorio.
 */
export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();
  const location = useLocation();
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light');

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(user, item.permission),
  );
  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const logout = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      header={{ height: HEADER_HEIGHT }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: true } }}
      footer={{ height: { base: BOTTOM_NAV_HEIGHT, sm: 0 } }}
      padding="md"
    >
      <AppShell.Header className="latk-safe-top">
        <Group h={HEADER_HEIGHT} px="md" justify="space-between" wrap="nowrap">
          <BrandMark size={28} />
          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              variant="subtle"
              size="lg"
              aria-label="Cambiar modo claro/oscuro"
              onClick={() => setColorScheme(scheme === 'dark' ? 'light' : 'dark')}
            >
              {scheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
            </ActionIcon>
            <Menu position="bottom-end" width={220}>
              <Menu.Target>
                <UnstyledButton aria-label="Menu de usuario">
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
                <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={logout}>
                  Cerrar sesion
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
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
          <Outlet />
        </Suspense>
      </AppShell.Main>

      <AppShell.Footer hiddenFrom="sm" className="latk-bottom-nav">
        <Group h={BOTTOM_NAV_HEIGHT} grow gap={0} wrap="nowrap">
          {items.map((item) => {
            const active = isActive(item.to);
            return (
              <UnstyledButton
                key={item.to}
                component={NavLink}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                h="100%"
              >
                <Stack gap={2} align="center" c={active ? 'brand' : 'dimmed'}>
                  <item.icon size={24} stroke={active ? 2.2 : 1.6} />
                  <Text size="xs" fw={active ? 700 : 500}>
                    {item.label}
                  </Text>
                </Stack>
              </UnstyledButton>
            );
          })}
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}
