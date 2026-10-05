import { Badge, Group, Progress, Stack, Text } from '@mantine/core';

/** Barra de perfil completo y lo que falta cargar. */
export function Completeness({
  value,
  missing,
  compact,
}: {
  value: number;
  missing: string[];
  compact?: boolean;
}) {
  const color = value === 100 ? 'teal' : value >= 60 ? 'yellow' : 'red';
  return (
    <Stack gap={4}>
      <Group justify="space-between" gap="xs">
        <Text size={compact ? 'xs' : 'sm'} c="dimmed">
          {value === 100 ? 'Perfil completo' : 'Perfil incompleto'}
        </Text>
        <Text size={compact ? 'xs' : 'sm'} fw={700} c={color}>
          {value} %
        </Text>
      </Group>
      <Progress value={value} color={color} size={compact ? 'sm' : 'md'} aria-label="Completitud" />
      {missing.length > 0 && (
        <Group gap={4}>
          <Text size="xs" c="dimmed">
            Falta:
          </Text>
          {missing.map((m) => (
            <Badge key={m} size="xs" variant="light" color="gray">
              {FIELD_LABEL[m] ?? m}
            </Badge>
          ))}
        </Group>
      )}
    </Stack>
  );
}

/** El backend manda las etiquetas sin tildes; aca se muestran bien escritas. */
const FIELD_LABEL: Record<string, string> = {
  Telefono: 'Teléfono',
};
