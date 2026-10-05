import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { InstallBanner } from './InstallApp';
import { isIos } from './installPrompt';

const renderBanner = () =>
  render(
    <MantineProvider>
      <InstallBanner />
    </MantineProvider>,
  );

describe('instalar la app', () => {
  beforeEach(() => localStorage.clear());

  it('reconoce iPhone y iPad, no Android', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(true);
    expect(isIos('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true);
    expect(isIos('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(false);
  });

  it('sin dialogo nativo, Instalar muestra los pasos', async () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Instalar' }));
    expect(await screen.findByRole('button', { name: 'Entendido' })).toBeTruthy();
    expect(screen.getByText('Agregar a la pantalla de inicio')).toBeTruthy();
  });

  it('al descartarlo no vuelve a aparecer', () => {
    const { unmount } = renderBanner();
    fireEvent.click(screen.getByLabelText('No mostrar más'));
    expect(screen.queryByRole('button', { name: 'Instalar' })).toBeNull();
    unmount();
    renderBanner();
    expect(screen.queryByRole('button', { name: 'Instalar' })).toBeNull();
  });
});
