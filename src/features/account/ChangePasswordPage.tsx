import { Button, Card, Group, PasswordInput, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api } from '../../api/endpoints';
import { PageHeader } from '../../shared/components/PageHeader';
import { notifyError, notifySuccess } from '../../shared/notify';

export const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72;

interface Values {
  currentPassword: string;
  newPassword: string;
  confirm: string;
}

/** Cada usuario (admin o vendedor) cambia su propia contrasena confirmando la actual. */
export function ChangePasswordPage() {
  const navigate = useNavigate();
  const form = useForm<Values>({
    initialValues: { currentPassword: '', newPassword: '', confirm: '' },
    validate: {
      currentPassword: (v) => (v ? null : 'Ingresá tu contraseña actual'),
      newPassword: (v, values) => {
        if (v.length < MIN_PASSWORD) return `Mínimo ${MIN_PASSWORD} caracteres`;
        if (v.length > MAX_PASSWORD) return `Máximo ${MAX_PASSWORD} caracteres`;
        if (v === values.currentPassword) return 'Tiene que ser distinta de la actual';
        return null;
      },
      confirm: (v, values) => (v === values.newPassword ? null : 'Las contraseñas no coinciden'),
    },
  });

  const change = useMutation({
    mutationFn: (values: Values) =>
      api.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      form.reset();
      notifySuccess('Contraseña actualizada');
      void navigate('/');
    },
    onError: (error) => notifyError(error),
  });

  return (
    <Stack>
      <PageHeader title="Cambiar contraseña" description="La próxima vez entrás con la nueva" />
      <Card withBorder padding="md">
        <form onSubmit={form.onSubmit((values) => change.mutate(values))}>
          <Stack>
            <PasswordInput
              label="Contraseña actual"
              autoComplete="current-password"
              {...form.getInputProps('currentPassword')}
            />
            <PasswordInput
              label="Contraseña nueva"
              autoComplete="new-password"
              description={`Entre ${MIN_PASSWORD} y ${MAX_PASSWORD} caracteres`}
              {...form.getInputProps('newPassword')}
            />
            <PasswordInput
              label="Repetí la contraseña nueva"
              autoComplete="new-password"
              {...form.getInputProps('confirm')}
            />
            <Text size="xs" c="dimmed">
              Distingue mayúsculas y minúsculas.
            </Text>
            <Group justify="flex-end">
              <Button type="submit" loading={change.isPending}>
                Guardar
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
