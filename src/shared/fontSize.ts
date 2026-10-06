import { create } from 'zustand';

/**
 * Tamaño de letra de toda la app (preferencia del dispositivo, en el menu de usuario). "Grande"
 * agranda la letra raiz: todo lo que mide en rem (textos, botones, espacios) escala junto.
 */
export type FontSize = 'normal' | 'large';

const KEY = 'latk-font-size';
export const LARGE_ROOT = '112.5%';

function load(): FontSize {
  try {
    return localStorage.getItem(KEY) === 'large' ? 'large' : 'normal';
  } catch {
    return 'normal';
  }
}

export function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize = size === 'large' ? LARGE_ROOT : '';
}

interface FontSizeState {
  size: FontSize;
  toggle: () => void;
}

export const useFontSize = create<FontSizeState>()((set, get) => ({
  size: load(),
  toggle: () => {
    const size: FontSize = get().size === 'large' ? 'normal' : 'large';
    try {
      localStorage.setItem(KEY, size);
    } catch {
      // sin almacenamiento: vale para esta sesion
    }
    applyFontSize(size);
    set({ size });
  },
}));

/** Al arrancar: aplica la preferencia guardada antes de pintar. */
export function initFontSize() {
  applyFontSize(useFontSize.getState().size);
}
