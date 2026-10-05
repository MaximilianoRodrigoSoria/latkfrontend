import { describe, expect, it } from 'vitest';
import { buildTheme, toMantineScheme } from './buildTheme';
import { LATK_THEME } from './defaults';

describe('buildTheme', () => {
  it('genera 10 tonalidades por color de la paleta', () => {
    const theme = buildTheme(LATK_THEME);
    expect(theme.colors?.brand).toHaveLength(10);
    expect(theme.colors?.accent).toHaveLength(10);
    expect(theme.primaryColor).toBe('brand');
    expect(theme.defaultRadius).toBe('md');
  });

  it('un color invalido cae a la paleta LATK en lugar de romper', () => {
    const theme = buildTheme({ ...LATK_THEME, primaryColor: 'no-es-color' });
    expect(theme.colors?.brand).toHaveLength(10);
  });

  it('traduce el esquema de color', () => {
    expect(toMantineScheme('DARK')).toBe('dark');
    expect(toMantineScheme('AUTO')).toBe('auto');
  });
});
