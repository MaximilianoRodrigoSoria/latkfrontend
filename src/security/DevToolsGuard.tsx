import { Button, Center, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useEffect, useState, type ReactNode } from 'react';
import { DEVTOOLS_ALLOWED, devToolsOpen, isDevToolsShortcut } from './devtools';

/**
 * Fuera de desarrollo, si se abren las herramientas del navegador la app se reemplaza por un cartel
 * de error (se desmonta: no queda contenido en la pagina). Al cerrarlas vuelve sola.
 */
export function DevToolsGuard({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (DEVTOOLS_ALLOWED) return;
    const check = () => setBlocked(devToolsOpen());
    const onKeyDown = (event: KeyboardEvent) => {
      if (isDevToolsShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onContextMenu = (event: Event) => event.preventDefault();

    check();
    const timer = window.setInterval(check, 1000);
    window.addEventListener('resize', check);
    window.addEventListener('keydown', onKeyDown, { capture: true });
    document.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', check);
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  if (!blocked) return <>{children}</>;
  return (
    <Center mih="100dvh" p="lg" bg="var(--mantine-color-body)">
      <Stack align="center" gap="sm" maw={420} ta="center">
        <ThemeIcon size={64} radius="xl" color="red" variant="light">
          <IconLock size={34} />
        </ThemeIcon>
        <Title order={3}>Acceso no permitido</Title>
        <Text c="dimmed">
          Las herramientas de desarrollo del navegador no están disponibles en esta aplicación.
          Cerralas para continuar.
        </Text>
        <Button variant="light" onClick={() => window.location.reload()}>
          Ya las cerré, recargar
        </Button>
      </Stack>
    </Center>
  );
}
