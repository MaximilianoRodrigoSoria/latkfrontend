import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom no implementa estas APIs del navegador que Mantine usa.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverStub;

// Textarea autosize escucha la carga de fuentes.
if (!document.fonts) {
  Object.defineProperty(document, 'fonts', {
    value: { addEventListener: () => undefined, removeEventListener: () => undefined },
  });
}

afterEach(() => cleanup());
