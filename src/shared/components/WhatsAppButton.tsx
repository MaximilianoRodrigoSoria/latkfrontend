import { ActionIcon, Button, type ButtonProps } from '@mantine/core';
import { IconBrandWhatsapp } from '@tabler/icons-react';
import type { MouseEvent, ReactNode } from 'react';

const WA_ME = 'https://wa.me/';

/**
 * Solo se abren links de WhatsApp click-to-chat. El backend ya lo valida; esto evita que un dato
 * inesperado termine abriendo otro sitio.
 */
export function isWhatsAppUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && url.startsWith(WA_ME);
}

interface WhatsAppButtonProps extends Omit<ButtonProps, 'component'> {
  href: string;
  children: ReactNode;
  onOpen?: () => void;
}

/**
 * Abre WhatsApp (app o web) con el mensaje ya escrito. Gratis: no envia nada solo, el vendedor
 * revisa el texto y lo manda.
 */
export function WhatsAppButton({ href, children, onOpen, ...props }: WhatsAppButtonProps) {
  if (!isWhatsAppUrl(href)) return null;
  return (
    <Button
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      color="green"
      leftSection={<IconBrandWhatsapp size={18} />}
      onClick={onOpen}
      {...props}
    >
      {children}
    </Button>
  );
}

/** Version compacta (solo icono), por ejemplo dentro de una lista. */
export function WhatsAppIcon({
  href,
  label,
  onOpen,
}: {
  href: string;
  label: string;
  onOpen?: () => void;
}) {
  if (!isWhatsAppUrl(href)) return null;
  return (
    <ActionIcon
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      variant="light"
      color="green"
      aria-label={label}
      title={label}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        onOpen?.();
      }}
    >
      <IconBrandWhatsapp size={18} />
    </ActionIcon>
  );
}
