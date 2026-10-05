import { Alert, Button, Modal, PasswordInput, Stack, Text } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useState } from 'react';

interface RevealEarningsModalProps {
  opened: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (password: string) => void;
}

export function RevealEarningsModal({
  opened,
  loading,
  error,
  onClose,
  onConfirm,
}: RevealEarningsModalProps) {
  const [password, setPassword] = useState('');

  const close = () => {
    setPassword('');
    onClose();
  };

  return (
    <Modal opened={opened} onClose={close} title="Ver mi ganancia" centered>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (password) onConfirm(password);
        }}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Confirma tu contrasena. La ganancia se muestra durante un minuto y despues se vuelve a
            ocultar.
          </Text>
          {error && (
            <Alert color="red" icon={<IconLock size={16} />}>
              {error}
            </Alert>
          )}
          <PasswordInput
            label="Contrasena"
            autoComplete="current-password"
            data-autofocus
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
          <Button type="submit" loading={loading} disabled={!password} fullWidth>
            Mostrar ganancia
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
