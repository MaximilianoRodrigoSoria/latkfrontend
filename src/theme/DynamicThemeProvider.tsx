import { MantineProvider } from '@mantine/core';
import { useMemo, type ReactNode } from 'react';
import { buildCssVariablesResolver, buildTheme, toMantineScheme } from './buildTheme';
import { useThemeTokens } from './useThemeTokens';

export function DynamicThemeProvider({ children }: { children: ReactNode }) {
  const tokens = useThemeTokens();
  const theme = useMemo(() => buildTheme(tokens), [tokens]);
  const resolver = useMemo(() => buildCssVariablesResolver(tokens), [tokens]);

  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={resolver}
      defaultColorScheme={toMantineScheme(tokens.defaultColorScheme)}
    >
      {children}
    </MantineProvider>
  );
}
