import { ActionIcon, Button, Menu } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconBrandWhatsapp, IconCopy, IconShare } from '@tabler/icons-react';
import { notifySuccess } from '../notify';

interface ShareButtonProps {
  title: string;
  /** Se arma recien al abrir el menu: siempre comparte lo que se ve en ese momento. */
  text: () => string;
  /** Boton con texto (true) o solo icono (false). */
  labeled?: boolean;
}

/**
 * Compartir como TEXTO (WhatsApp, menu del sistema o copiar). No usa capturas: en roles sin ADMIN
 * las capturas estan bloqueadas y el texto llega igual de bien al cliente.
 */
export function ShareButton({ title, text, labeled = true }: ShareButtonProps) {
  const clipboard = useClipboard();
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const target = labeled ? (
    <Button variant="light" leftSection={<IconShare size={18} />}>
      Compartir
    </Button>
  ) : (
    <ActionIcon variant="subtle" size="lg" aria-label="Compartir">
      <IconShare size={20} />
    </ActionIcon>
  );

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>{target}</Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconBrandWhatsapp size={18} color="var(--mantine-color-green-6)" />}
          component="a"
          href={`https://wa.me/?text=${encodeURIComponent(text())}`}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </Menu.Item>
        {canShare && (
          <Menu.Item
            leftSection={<IconShare size={18} />}
            onClick={() => void navigator.share({ title, text: text() }).catch(() => undefined)}
          >
            Otras apps
          </Menu.Item>
        )}
        <Menu.Item
          leftSection={<IconCopy size={18} />}
          onClick={() => {
            clipboard.copy(text());
            notifySuccess('Texto copiado');
          }}
        >
          Copiar texto
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
