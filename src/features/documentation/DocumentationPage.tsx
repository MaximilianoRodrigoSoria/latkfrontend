import { Alert, Anchor, Button, Card, Loader, Stack, Text, Title } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import Markdown from 'react-markdown';
import { getToken, useAuthStore } from '../../auth/authStore';
import { PageHeader } from '../../shared/components/PageHeader';
import {
  documentationSite,
  GUIDE_LABEL,
  guideRole,
  headingId,
  loadGuide,
  type GuideRole,
} from './guides';
import './documentation.css';

export function DocumentationPage() {
  const user = useAuthStore((state) => state.user);
  const role = guideRole(user);
  const site = role ? documentationSite(role) : null;
  return (
    <Stack maw={900} mx="auto">
      <PageHeader
        title="Documentación de flujos"
        description={role ? `Guía para ${GUIDE_LABEL[role].toLowerCase()}` : undefined}
      />
      <Text size="sm" c="dimmed">
        Consultá los pasos de tu trabajo. Para conocer los controles de una pantalla, usá Guía de
        esta pantalla desde el menú de tu cuenta.
      </Text>
      {site && (
        <Button
          component="a"
          href={site}
          target="_blank"
          rel="noopener noreferrer"
          variant="light"
          rightSection={<IconExternalLink size={16} />}
        >
          Abrir sitio de documentación
        </Button>
      )}
      {role ? (
        <GuideContent key={`${user?.userId}:${role}`} role={role} />
      ) : (
        <Alert title="Guía no disponible">
          Todavía no hay una guía para el rol de esta cuenta.
        </Alert>
      )}
    </Stack>
  );
}

function GuideContent({ role }: { role: GuideRole }) {
  const userId = useAuthStore((state) => state.user?.userId);
  const guide = useQuery({
    queryKey: ['flow-guide', userId, role],
    queryFn: ({ signal }) => loadGuide(getToken(), signal),
    retry: false,
    gcTime: 0,
  });
  if (guide.isPending) return <Loader aria-label="Cargando guía" />;
  if (guide.isError)
    return (
      <Alert color="red" title="No se pudo abrir la documentación">
        <Stack>
          <Text>{guide.error.message}</Text>
          <Button onClick={() => void guide.refetch()}>Reintentar</Button>
        </Stack>
      </Alert>
    );
  if (guide.data.role !== role)
    return <Alert>La guía no corresponde a esta cuenta. Volvé a ingresar.</Alert>;
  const text = guide.data.markdown;
  const sections = Array.from(text.matchAll(/^## (.+)$/gm), (match) => match[1]!.trim());
  return (
    <>
      <Card withBorder component="nav" aria-label="Índice de la guía">
        <Stack gap="xs">
          <Text fw={700}>En esta guía</Text>
          {sections.map((section) => (
            <Anchor key={section} href={`#${headingId(section)}`} size="sm">
              {section}
            </Anchor>
          ))}
        </Stack>
      </Card>
      <Card withBorder component="article" className="latk-flow-guide">
        <Markdown
          components={{
            h1: ({ children }) => <Title order={2}>{children}</Title>,
            h2: ({ children }) => (
              <Title order={3} id={headingId(String(children))}>
                {children}
              </Title>
            ),
          }}
        >
          {text}
        </Markdown>
      </Card>
    </>
  );
}
