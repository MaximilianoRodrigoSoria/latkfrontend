import { generateColors } from '@mantine/colors-generator';
import {
  createTheme,
  type CSSVariablesResolver,
  type MantineColorScheme,
  type MantineThemeOverride,
} from '@mantine/core';
import type { ThemeTokens } from '../api/types';
import { isHexColor } from './contrast';
import { LATK_THEME } from './defaults';

/** Un hex invalido nunca rompe la app: se cae al color oficial. */
function safe(value: string, fallback: string): string {
  return isHexColor(value) ? value : fallback;
}

/**
 * Traduce los tokens del backend a un tema de Mantine. Cada color base se expande a las 10
 * tonalidades que Mantine necesita, asi el admin solo elige un color por rol.
 */
export function buildTheme(tokens: ThemeTokens): MantineThemeOverride {
  return createTheme({
    primaryColor: 'brand',
    primaryShade: { light: 6, dark: 5 },
    colors: {
      brand: generateColors(safe(tokens.primaryColor, LATK_THEME.primaryColor)),
      accent: generateColors(safe(tokens.accentColor, LATK_THEME.accentColor)),
      success: generateColors(safe(tokens.successColor, LATK_THEME.successColor)),
      deep: generateColors(safe(tokens.brandDeepColor, LATK_THEME.brandDeepColor)),
    },
    defaultRadius: tokens.radius.toLowerCase(),
    fontFamily: tokens.fontFamily,
    headings: { fontFamily: tokens.fontFamily, fontWeight: '700' },
    // Objetivos tactiles comodos en celular.
    components: {
      Button: { defaultProps: { size: 'md' } },
      TextInput: { defaultProps: { size: 'md' } },
      PasswordInput: { defaultProps: { size: 'md' } },
      NumberInput: { defaultProps: { size: 'md' } },
      Select: { defaultProps: { size: 'md' } },
    },
    other: { tokens },
  });
}

/** Fondos de la paleta aplicados como variables CSS de Mantine. */
export function buildCssVariablesResolver(tokens: ThemeTokens): CSSVariablesResolver {
  return () => ({
    variables: {
      '--latk-accent': safe(tokens.accentColor, LATK_THEME.accentColor),
      '--latk-deep': safe(tokens.brandDeepColor, LATK_THEME.brandDeepColor),
    },
    light: { '--mantine-color-body': safe(tokens.lightBackground, LATK_THEME.lightBackground) },
    dark: { '--mantine-color-body': safe(tokens.darkBackground, LATK_THEME.darkBackground) },
  });
}

export function toMantineScheme(value: ThemeTokens['defaultColorScheme']): MantineColorScheme {
  return value === 'LIGHT' ? 'light' : value === 'DARK' ? 'dark' : 'auto';
}
