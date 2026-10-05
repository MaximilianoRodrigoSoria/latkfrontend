import type { ThemeTokens } from '../api/types';

/** Paleta oficial LATK (docs/logos). Debe coincidir con ThemePalette.latkDefault() del backend. */
export const LATK_THEME: ThemeTokens = {
  primaryColor: '#1673FF',
  accentColor: '#00E8FF',
  successColor: '#34FFE9',
  brandDeepColor: '#002C6B',
  darkBackground: '#0E1621',
  lightBackground: '#F8FAFC',
  radius: 'MD',
  fontFamily: 'Inter, system-ui, sans-serif',
  defaultColorScheme: 'AUTO',
};

export const FONT_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter / sistema' },
  { value: 'system-ui, sans-serif', label: 'Sistema' },
  { value: 'Roboto, Arial, sans-serif', label: 'Roboto' },
  { value: 'Montserrat, Arial, sans-serif', label: 'Montserrat' },
  { value: 'Georgia, serif', label: 'Georgia (serif)' },
];
