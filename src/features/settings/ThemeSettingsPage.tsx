import {
  Alert,
  Badge,
  Button,
  Card,
  ColorInput,
  Group,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconPalette, IconRestore } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api, queryKeys } from '../../api/endpoints';
import type { ThemeRadius, ThemeTokens } from '../../api/types';
import { PageHeader } from '../../shared/components/PageHeader';
import { notifyError, notifySuccess } from '../../shared/notify';
import { contrastRatio, isHexColor, wcagLevel } from '../../theme/contrast';
import { FONT_OPTIONS, LATK_THEME } from '../../theme/defaults';
import { useThemePreview } from '../../theme/themePreviewStore';
import { useServerTheme } from '../../theme/useThemeTokens';

const COLOR_FIELDS: { key: keyof ThemeTokens; label: string; description: string }[] = [
  { key: 'primaryColor', label: 'Primario', description: 'Botones, enlaces y seleccion' },
  { key: 'accentColor', label: 'Acento', description: 'Destacados y graficos' },
  { key: 'successColor', label: 'Exito', description: 'Estados positivos' },
  { key: 'brandDeepColor', label: 'Marca profundo', description: 'Superficies de marca' },
  { key: 'darkBackground', label: 'Fondo oscuro', description: 'Fondo en modo oscuro' },
  { key: 'lightBackground', label: 'Fondo claro', description: 'Fondo en modo claro' },
];

const LATK_SWATCHES = ['#1673FF', '#00E8FF', '#34FFE9', '#002C6B', '#0E1621', '#F8FAFC'];

export function ThemeSettingsPage() {
  const { data: server } = useServerTheme();
  const draft = useThemePreview((s) => s.draft);
  const setDraft = useThemePreview((s) => s.setDraft);
  const queryClient = useQueryClient();
  const current: ThemeTokens = draft ?? server ?? LATK_THEME;

  // Al salir de la pantalla se descarta el borrador no guardado.
  useEffect(() => () => setDraft(null), [setDraft]);

  const update = (patch: Partial<ThemeTokens>) => setDraft({ ...current, ...patch });

  const onSaved = (message: string) => (theme: ThemeTokens) => {
    queryClient.setQueryData(queryKeys.theme, theme);
    setDraft(null);
    notifySuccess(message);
  };
  const save = useMutation({
    mutationFn: api.updateTheme,
    onSuccess: onSaved('Tema guardado'),
    onError: (e) => notifyError(e),
  });
  const reset = useMutation({
    mutationFn: api.resetTheme,
    onSuccess: onSaved('Paleta LATK restaurada'),
    onError: (e) => notifyError(e),
  });

  const invalid = COLOR_FIELDS.some((f) => !isHexColor(String(current[f.key])));
  const primaryOnLight = contrastRatio(
    '#FFFFFF',
    isHexColor(current.primaryColor) ? current.primaryColor : LATK_THEME.primaryColor,
  );

  return (
    <Stack pb="xl">
      <PageHeader
        title="Design system"
        description="Los cambios se ven en vivo; se aplican a todos al guardar"
      />

      <Card withBorder>
        <Stack>
          <Group gap="xs">
            <IconPalette size={20} />
            <Text fw={600}>Colores</Text>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            {COLOR_FIELDS.map((field) => (
              <ColorInput
                key={field.key}
                label={field.label}
                description={field.description}
                format="hex"
                swatches={LATK_SWATCHES}
                value={String(current[field.key])}
                onChange={(value) => update({ [field.key]: value.toUpperCase() })}
                error={isHexColor(String(current[field.key])) ? null : 'Formato #RRGGBB'}
              />
            ))}
          </SimpleGrid>
          <ContrastBadge label="Texto blanco sobre primario" ratio={primaryOnLight} />
        </Stack>
      </Card>

      <Card withBorder>
        <Stack>
          <Text fw={600}>Forma y tipografia</Text>
          <Stack gap={4}>
            <Text size="sm">Radio de bordes</Text>
            <SegmentedControl
              fullWidth
              value={current.radius}
              onChange={(value) => update({ radius: value as ThemeRadius })}
              data={['XS', 'SM', 'MD', 'LG', 'XL']}
            />
          </Stack>
          <Select
            label="Tipografia"
            data={FONT_OPTIONS}
            value={current.fontFamily}
            onChange={(value) => value && update({ fontFamily: value })}
            allowDeselect={false}
          />
          <Stack gap={4}>
            <Text size="sm">Modo por defecto</Text>
            <SegmentedControl
              fullWidth
              value={current.defaultColorScheme}
              onChange={(value) =>
                update({ defaultColorScheme: value as ThemeTokens['defaultColorScheme'] })
              }
              data={[
                { value: 'AUTO', label: 'Automatico' },
                { value: 'LIGHT', label: 'Claro' },
                { value: 'DARK', label: 'Oscuro' },
              ]}
            />
          </Stack>
        </Stack>
      </Card>

      <Card withBorder>
        <Text fw={600} mb="sm">
          Vista previa
        </Text>
        <Group>
          <Button>Primario</Button>
          <Button variant="light">Secundario</Button>
          <Button color="accent" variant="filled">
            Acento
          </Button>
          <Badge color="success">Al dia</Badge>
          <ThemeIcon color="deep" size="lg">
            <IconCheck size={18} />
          </ThemeIcon>
        </Group>
      </Card>

      {draft && (
        <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
          Hay cambios sin guardar. Solo vos los estas viendo.
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, xs: 3 }}>
        <Button
          disabled={!draft || invalid}
          loading={save.isPending}
          onClick={() => save.mutate(current)}
        >
          Guardar para todos
        </Button>
        <Button variant="default" disabled={!draft} onClick={() => setDraft(null)}>
          Descartar cambios
        </Button>
        <Button
          variant="subtle"
          color="red"
          leftSection={<IconRestore size={18} />}
          loading={reset.isPending}
          onClick={() => reset.mutate()}
        >
          Restaurar LATK
        </Button>
      </SimpleGrid>
    </Stack>
  );
}

function ContrastBadge({ label, ratio }: { label: string; ratio: number }) {
  const level = wcagLevel(ratio);
  const color = level === 'Insuficiente' ? 'red' : level === 'AA grande' ? 'yellow' : 'teal';
  return (
    <Group gap="xs">
      <Text size="sm" c="dimmed">
        {label}:
      </Text>
      <Badge color={color} variant="light">
        {ratio.toFixed(2)}:1 · {level}
      </Badge>
    </Group>
  );
}
