import { Alert, Button, Card, FileButton, Group, Modal, Stack, Text } from '@mantine/core';
import { IconDatabaseExport, IconDatabaseImport } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/endpoints';
import type { BackupImportResult } from '../../api/types';
import { PageHeader } from '../../shared/components/PageHeader';
import { notifyError, notifySuccess } from '../../shared/notify';

/**
 * Respaldo completo de los datos (solo admin). El ZIP trae un JSON por tabla para reimportar y un
 * CSV por tabla para abrir en una planilla o imprimir. Nunca incluye contraseñas.
 */
export function BackupPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BackupImportResult | null>(null);
  const exporter = useMutation({
    mutationFn: api.exportBackup,
    onSuccess: () => notifySuccess('Respaldo descargado'),
    onError: (error) => notifyError(error),
  });
  const importer = useMutation({
    mutationFn: (f: File) => api.importBackup(f),
    onSuccess: (r) => {
      setFile(null);
      setResult(r);
      void queryClient.invalidateQueries();
    },
    onError: (error) => {
      setFile(null);
      notifyError(error);
    },
  });

  return (
    <Stack>
      <PageHeader
        title="Respaldo de datos"
        description="Exportá todo para guardarlo, imprimirlo o volver a cargarlo"
      />
      <Card withBorder padding="md">
        <Stack gap="xs">
          <Text fw={700}>Exportar</Text>
          <Text size="sm" c="dimmed">
            Un archivo ZIP con cada tabla en JSON (para reimportar) y en CSV (para abrir en Excel o
            imprimir). No incluye contraseñas.
          </Text>
          <Group>
            <Button
              leftSection={<IconDatabaseExport size={18} />}
              loading={exporter.isPending}
              onClick={() => exporter.mutate()}
            >
              Descargar respaldo
            </Button>
          </Group>
        </Stack>
      </Card>
      <Card withBorder padding="md">
        <Stack gap="xs">
          <Text fw={700}>Importar</Text>
          <Text size="sm" c="dimmed">
            Agrega lo que falte y deja como está lo que ya existe. Si algo falla, no se carga nada.
            Los usuarios importados necesitan una contraseña nueva.
          </Text>
          <Group>
            <FileButton onChange={setFile} accept="application/zip,.zip">
              {(props) => (
                <Button variant="light" leftSection={<IconDatabaseImport size={18} />} {...props}>
                  Elegir respaldo…
                </Button>
              )}
            </FileButton>
          </Group>
          {result && (
            <Alert color="teal" title="Respaldo importado">
              {result.inserted === 0
                ? 'No había nada nuevo: todo ya estaba cargado.'
                : `Se agregaron ${result.inserted} registros.`}
            </Alert>
          )}
        </Stack>
      </Card>
      <Modal
        opened={file !== null}
        onClose={() => setFile(null)}
        title="Importar respaldo"
        centered
      >
        <Stack>
          <Text size="sm">
            ¿Importar <b>{file?.name}</b>? Solo se agregan los registros que no existen.
          </Text>
          <Group grow>
            <Button variant="default" onClick={() => setFile(null)} disabled={importer.isPending}>
              Cancelar
            </Button>
            <Button loading={importer.isPending} onClick={() => file && importer.mutate(file)}>
              Importar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
