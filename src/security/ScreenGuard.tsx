import { Box, Center, Stack, Text, useComputedColorScheme } from '@mantine/core';
import { useInterval } from '@mantine/hooks';
import { IconEyeOff } from '@tabler/icons-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuthStore } from '../auth/authStore';
import { requiresScreenProtection } from '../auth/permissions';
import { SCREENSHOTS_ALLOWED } from './screenshotsMode';
import { useNativeScreenProtection } from './useNativeScreenProtection';
import { watermarkDataUrl, watermarkLabel } from './watermark';

const BLOCKED_SHORTCUTS = new Set(['p', 's']); // imprimir y guardar pagina

/**
 * Proteccion de pantalla para todo rol distinto de ADMIN.
 *
 * - App Android: bloqueo real (FLAG_SECURE) via useNativeScreenProtection.
 * - Navegador/PWA: disuasion. Marca de agua con usuario y hora, contenido oculto cuando la app
 *   pierde el foco (selector de apps, herramientas de captura), sin seleccionar/copiar/imprimir.
 *   Un navegador NO puede impedir la captura del sistema operativo.
 */
export function ScreenGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const protect = !SCREENSHOTS_ALLOWED && requiresScreenProtection(user);
  const scheme = useComputedColorScheme('light');
  const [concealed, setConcealed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useNativeScreenProtection(protect);
  useInterval(() => setNow(new Date()), 60_000, { autoInvoke: true });

  useEffect(() => {
    if (!protect) return;
    document.body.classList.add('latk-protected');

    const conceal = () => setConcealed(true);
    const reveal = () => setConcealed(false);
    const onVisibility = () => (document.hidden ? conceal() : reveal());
    const prevent = (event: Event) => event.preventDefault();
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && BLOCKED_SHORTCUTS.has(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      // PrintScreen en Windows: la captura ya ocurrio, pero se oculta y se pisa el portapapeles.
      if (event.key === 'PrintScreen') {
        conceal();
        void navigator.clipboard?.writeText('').catch(() => undefined);
        window.setTimeout(reveal, 1500);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', conceal);
    window.addEventListener('focus', reveal);
    window.addEventListener('beforeprint', conceal);
    window.addEventListener('afterprint', reveal);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('dragstart', prevent);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      document.body.classList.remove('latk-protected');
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', conceal);
      window.removeEventListener('focus', reveal);
      window.removeEventListener('beforeprint', conceal);
      window.removeEventListener('afterprint', reveal);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('cut', prevent);
      document.removeEventListener('dragstart', prevent);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      setConcealed(false);
    };
  }, [protect]);

  if (!protect) return <>{children}</>;

  const inkColor = scheme === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)';
  return (
    <>
      <Box style={{ filter: concealed ? 'blur(24px)' : undefined }} aria-hidden={concealed}>
        {children}
      </Box>
      <Box
        data-testid="watermark"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 10000,
          backgroundImage: watermarkDataUrl(
            watermarkLabel(user?.username ?? 'sin sesion', now),
            inkColor,
          ),
        }}
      />
      {concealed && (
        <Center
          style={{ position: 'fixed', inset: 0, zIndex: 10001 }}
          bg="var(--mantine-color-body)"
        >
          <Stack align="center" gap="xs">
            <IconEyeOff size={40} />
            <Text fw={600}>Contenido protegido</Text>
            <Text size="sm" c="dimmed">
              Volve a la app para continuar
            </Text>
          </Stack>
        </Center>
      )}
    </>
  );
}
