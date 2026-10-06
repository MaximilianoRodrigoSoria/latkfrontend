import { Card, Collapse, Group, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';
import type { ReactNode } from 'react';

/**
 * Seccion plegable: titulo siempre visible (con un dato breve a la derecha) y el detalle recien al
 * tocarla. Mantiene las fichas cortas sin esconder informacion.
 */
export function Foldable({
  title,
  aside,
  defaultOpen = false,
  children,
}: {
  title: string;
  /** Dato breve junto al titulo: un contador o un badge. */
  aside?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [opened, { toggle }] = useDisclosure(defaultOpen);
  return (
    <Card withBorder padding="md">
      <UnstyledButton onClick={toggle} aria-expanded={opened} w="100%">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={700}>{title}</Text>
          <Group gap="xs" wrap="nowrap">
            {aside}
            <IconChevronDown
              className="latk-fold-chevron"
              size={18}
              style={{
                transform: opened ? 'rotate(180deg)' : undefined,
                transition: 'transform 150ms ease',
              }}
            />
          </Group>
        </Group>
      </UnstyledButton>
      <Collapse expanded={opened}>
        <div style={{ paddingTop: 'var(--mantine-spacing-sm)' }}>{children}</div>
      </Collapse>
    </Card>
  );
}
