import { DatesProvider } from '@mantine/dates';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'dayjs/locale/es';
import { RouterProvider } from 'react-router';
import { configureHttp } from '../api/http';
import { getToken, useAuthStore } from '../auth/authStore';
import { ScreenGuard } from '../security/ScreenGuard';
import { ToastHost } from '../shared/components/ToastHost';
import { DynamicThemeProvider } from '../theme/DynamicThemeProvider';
import { router } from './router';

configureHttp(getToken, () => useAuthStore.getState().signOut());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // En celular la app vuelve del segundo plano seguido: refresca al recuperar el foco.
      refetchOnWindowFocus: true,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DynamicThemeProvider>
        <DatesProvider settings={{ locale: 'es', firstDayOfWeek: 1 }}>
          <ToastHost />
          <ScreenGuard>
            <RouterProvider router={router} />
          </ScreenGuard>
        </DatesProvider>
      </DynamicThemeProvider>
    </QueryClientProvider>
  );
}
