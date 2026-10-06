import { MotionConfig } from 'motion/react';
import { DatesProvider } from '@mantine/dates';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'dayjs/locale/es';
import { RouterProvider } from 'react-router';
import { configureHttp } from '../api/http';
import { getToken, useAuthStore } from '../auth/authStore';
import { DevToolsGuard } from '../security/DevToolsGuard';
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

// Al cambiar de cuenta en esta pestaña se descartan los datos de la anterior: nunca se muestran
// datos de un usuario con la sesion de otro.
useAuthStore.subscribe((state, previous) => {
  if (state.user?.userId !== previous.user?.userId) queryClient.clear();
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <DynamicThemeProvider>
          <DatesProvider settings={{ locale: 'es', firstDayOfWeek: 1 }}>
            <ToastHost />
            <DevToolsGuard>
              <ScreenGuard>
                <RouterProvider router={router} />
              </ScreenGuard>
            </DevToolsGuard>
          </DatesProvider>
        </DynamicThemeProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
