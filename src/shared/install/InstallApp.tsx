import {
  Button,
  Card,
  CloseButton,
  Group,
  List,
  Modal,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDeviceMobileDown, IconDots, IconShare2, IconSquarePlus } from '@tabler/icons-react';
import { useState } from 'react';
import { notifySuccess } from '../notify';
import { isIos, promptInstall, useInstallState } from './installPrompt';

const DISMISS_KEY = 'latk.install.dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Instalar la app en el celular: deja un acceso directo en la pantalla de inicio y abre a pantalla
 * completa. En Android/Chrome usa el dialogo nativo; en iPhone (o si el navegador no lo ofrece)
 * muestra los pasos.
 */
export function useInstallApp() {
  const state = useInstallState();
  const [helpOpen, help] = useDisclosure(false);

  const install = async () => {
    if (state.canPrompt) {
      if (await promptInstall()) notifySuccess('¡Listo! Ya tenés L.A TK en tu pantalla de inicio');
      return;
    }
    help.open();
  };

  const helpModal = (
    <Modal opened={helpOpen} onClose={help.close} title="Instalar L.A TK" centered>
      <Stack>
        {isIos() ? (
          <List spacing="xs" type="ordered">
            <List.Item icon={<IconShare2 size={18} />}>
              Tocá el botón <b>Compartir</b> de Safari (el cuadrado con la flecha).
            </List.Item>
            <List.Item icon={<IconSquarePlus size={18} />}>
              Elegí <b>Agregar a inicio</b> y confirmá con <b>Agregar</b>.
            </List.Item>
          </List>
        ) : (
          <List spacing="xs" type="ordered">
            <List.Item icon={<IconDots size={18} />}>
              Abrí el menú del navegador (los tres puntos).
            </List.Item>
            <List.Item icon={<IconSquarePlus size={18} />}>
              Elegí <b>Instalar app</b> o <b>Agregar a la pantalla de inicio</b>.
            </List.Item>
          </List>
        )}
        <Text size="xs" c="dimmed">
          Queda un ícono de L.A TK en tu celular y se abre a pantalla completa, como cualquier app.
        </Text>
        <Button onClick={help.close}>Entendido</Button>
      </Stack>
    </Modal>
  );

  return { available: !state.installed, install, helpModal };
}

/** Aviso en Inicio, solo en el celular y mientras no este instalada ni se haya descartado. */
export function InstallBanner() {
  const { available, install, helpModal } = useInstallApp();
  const [dismissed, setDismissed] = useState(readDismissed);
  if (!available || dismissed) return helpModal;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // sin almacenamiento: solo se oculta en esta sesion
    }
  };

  return (
    <>
      <Card withBorder padding="sm" hiddenFrom="sm">
        <Group wrap="nowrap" align="center">
          <ThemeIcon size={40} radius="md" variant="light">
            <IconDeviceMobileDown size={22} />
          </ThemeIcon>
          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={700} size="sm">
              Instalá L.A TK
            </Text>
            <Text size="xs" c="dimmed">
              Acceso directo en tu celular, a pantalla completa.
            </Text>
          </Stack>
          <Button size="xs" onClick={() => void install()}>
            Instalar
          </Button>
          <CloseButton aria-label="No mostrar más" onClick={dismiss} />
        </Group>
      </Card>
      {helpModal}
    </>
  );
}
