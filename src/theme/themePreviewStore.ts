import { create } from 'zustand';
import type { ThemeTokens } from '../api/types';

/**
 * Tema en edicion. Mientras el admin edita, toda la app se pinta con este borrador; al guardar o
 * cancelar se limpia y vuelve a regir el tema del servidor.
 */
interface ThemePreviewState {
  draft: ThemeTokens | null;
  setDraft: (draft: ThemeTokens | null) => void;
}

export const useThemePreview = create<ThemePreviewState>()((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
}));
