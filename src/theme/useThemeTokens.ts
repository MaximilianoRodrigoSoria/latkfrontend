import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '../api/endpoints';
import type { ThemeTokens } from '../api/types';
import { LATK_THEME } from './defaults';
import { useThemePreview } from './themePreviewStore';

const CACHE_KEY = 'latk-theme';

/** Ultimo tema conocido: la app arranca con los colores correctos aun sin red. */
function cachedTheme(): ThemeTokens {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? { ...LATK_THEME, ...(JSON.parse(raw) as Partial<ThemeTokens>) } : LATK_THEME;
  } catch {
    return LATK_THEME;
  }
}

export function useServerTheme() {
  return useQuery({
    queryKey: queryKeys.theme,
    queryFn: async () => {
      const theme = await api.theme();
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(theme));
      } catch {
        // Sin almacenamiento disponible: se usa el tema en memoria.
      }
      return theme;
    },
    staleTime: 5 * 60_000,
    placeholderData: () => ({
      ...cachedTheme(),
      customized: false,
      updatedAt: null,
      updatedBy: null,
    }),
  });
}

/** Tema efectivo: borrador en edicion > servidor > cache local > paleta LATK. */
export function useThemeTokens(): ThemeTokens {
  const draft = useThemePreview((s) => s.draft);
  const { data } = useServerTheme();
  return draft ?? data ?? LATK_THEME;
}
