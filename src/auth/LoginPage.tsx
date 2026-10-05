import {
  Alert,
  Box,
  Button,
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
import { Navigate, useLocation, useNavigate } from 'react-router';
import { api } from '../api/endpoints';
import logoDark from '../assets/brand/latk-app-dark.png';
import logoLight from '../assets/brand/latk-app-light.png';
import { getToken, useAuthStore } from './authStore';

export function LoginPage() {
  const signIn = useAuthStore((s) => s.signIn);
  const navigate = useNavigate();
  const location = useLocation();
  const scheme = useComputedColorScheme('light');
  const from = (location.state as { from?: string } | null)?.from ?? '/';

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
      navigate(from, { replace: true });
    },
  });

  if (getToken()) return <Navigate to="/" replace />;

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
        <Paper withBorder shadow="sm" p="lg">
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
