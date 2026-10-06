import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PullToRefresh } from './PullToRefresh';

function setup(onRefresh: () => Promise<unknown>) {
  const view = render(
    <MantineProvider>
      <PullToRefresh onRefresh={onRefresh} />
    </MantineProvider>,
  );
  const handle = view.container.querySelector('.latk-refresh-handle') as HTMLElement;
  handle.setPointerCapture = vi.fn();
  const pointer = (type: string, y: number, pointerType = 'touch') => {
    const event = new Event(type, { bubbles: true });
    Object.defineProperties(event, {
      clientY: { value: y },
      pointerId: { value: 1 },
      pointerType: { value: pointerType },
    });
    fireEvent(handle, event);
  };
  return { pointer };
}

describe('PullToRefresh', () => {
  it('allows button refresh and prevents overlapping requests', async () => {
    let finish!: () => void;
    const refresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    setup(refresh);
    const button = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toBe('Actualizando datos');
    await act(async () => finish());
    fireEvent.click(button);
    expect(refresh).toHaveBeenCalledTimes(2);
    await act(async () => finish());
  });

  it('refreshes only after a sufficiently long touch pull is released', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { pointer } = setup(refresh);
    pointer('pointerdown', 100);
    pointer('pointermove', 180);
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByText('Soltá para actualizar')).toBeTruthy();
    pointer('pointerup', 180);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('ignores short pulls, cancelled gestures and mouse drags', () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { pointer } = setup(refresh);
    pointer('pointerdown', 100);
    pointer('pointerup', 130);
    pointer('pointerdown', 100);
    pointer('pointermove', 190);
    pointer('pointercancel', 190);
    pointer('pointerup', 190);
    pointer('pointerdown', 100, 'mouse');
    pointer('pointerup', 190, 'mouse');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('announces a failed refresh and allows retry', async () => {
    const refresh = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    setup(refresh);
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('No se pudo actualizar'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(''));
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
