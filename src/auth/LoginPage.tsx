import {
  Alert,
  Anchor,
  Box,
  Button,
  Divider,
  Center,
  Image,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  useComputedColorScheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { api } from '../api/endpoints';
import logoDark from '../assets/brand/latk-app-dark.png';
import logoLight from '../assets/brand/latk-app-light.png';
import { getToken, otherAccounts, useAuthStore } from './authStore';
import { roleLabel } from './permissions';

export function LoginPage() {
  const signIn = useAuthStore((s) => s.signIn);
  const switchAccount = useAuthStore((s) => s.switchAccount);
  const accounts = useAuthStore((s) => s.accounts);
  const current = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const scheme = useComputedColorScheme('light');
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  // "Agregar otra cuenta": se ingresa con otro usuario sin cerrar la sesion actual.
  const adding = new URLSearchParams(location.search).has('add');
  const saved = otherAccounts({ accounts, user: current });

  const form = useForm({
    initialValues: { username: '', password: '' },
    validate: {
      username: (v) => (v.trim() ? null : 'Ingresa tu usuario'),
      password: (v) => (v ? null : 'Ingresa tu contrasena'),
    },
  });

  const login = useMutation({
    mutationFn: api.login,
    onSuccess: (data) => {
      signIn(data.accessToken);
      navigate(adding ? '/' : from, { replace: true });
    },
  });

  if (getToken() && !adding) return <Navigate to="/" replace />;

  const continueAs = (userId: string) => {
    switchAccount(userId);
    navigate(adding ? '/' : from, { replace: true });
  };

  return (
    <Center mih="100dvh" p="md" className="latk-safe-top">
      <Box w="100%" maw={400}>
        <Stack align="center" gap="xs" mb="lg">
          <Image src={scheme === 'dark' ? logoDark : logoLight} alt="L.A TK" w={96} h={96} />
          <Title order={1} size="h2">
            L.A TK
          </Title>
          <Text size="sm" c="dimmed" ta="center">
            Latin America Transaction Kernel
          </Text>
        </Stack>
        {saved.length > 0 && (
          <Paper withBorder p="md" mb="md">
            <Text size="sm" fw={600} mb="xs">
              Continuar como
            </Text>
            <Stack gap="xs">
              {saved.map((account) => (
                <Button
                  key={account.user.userId}
                  variant="light"
                  justify="space-between"
                  fullWidth
                  onClick={() => continueAs(account.user.userId)}
                  rightSection={
                    <Text size="xs" c="dimmed">
                      {roleLabel(account.user)}
                    </Text>
                  }
                >
                  {account.user.fullName}
                </Button>
              ))}
            </Stack>
            <Divider label="o ingresá con otra cuenta" labelPosition="center" mt="md" />
          </Paper>
        )}
        <Paper withBorder shadow="sm" p="lg">
          {adding && current && (
            <Text size="sm" c="dimmed" mb="sm">
              Agregás una cuenta sin cerrar la de {current.fullName}.{' '}
              <Anchor component={Link} to="/" size="sm">
                Volver
              </Anchor>
            </Text>
          )}
          <form onSubmit={form.onSubmit((values) => login.mutate(values))}>
            <Stack>
              {login.isError && (
                <Alert color="red" icon={<IconAlertCircle size={18} />}>
                  {login.error.message}
                </Alert>
              )}
              <TextInput
                label="Usuario"
                autoComplete="username"
                autoCapitalize="none"
                {...form.getInputProps('username')}
              />
              <PasswordInput
                label="Contrasena"
                autoComplete="current-password"
                {...form.getInputProps('password')}
              />
              <Button type="submit" fullWidth loading={login.isPending} mt="xs">
                Ingresar
              </Button>
            </Stack>
          </form>
        </Paper>
      </Box>
    </Center>
  );
}
