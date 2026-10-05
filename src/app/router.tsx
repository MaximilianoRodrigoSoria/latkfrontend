import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { LoginPage } from '../auth/LoginPage';
import { RequireAuth, RequirePermission } from '../auth/RequireAuth';
import { Permission } from '../auth/permissions';
import { AppLayout } from '../layout/AppLayout';

// Una ruta por chunk: en celular se descarga solo la pantalla que se abre (los graficos del
// simulador pesan y no hacen falta en el login).
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ProductsPage = lazy(() =>
  import('../features/products/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
const SimulatorPage = lazy(() =>
  import('../features/simulator/SimulatorPage').then((m) => ({ default: m.SimulatorPage })),
);
const ThemeSettingsPage = lazy(() =>
  import('../features/settings/ThemeSettingsPage').then((m) => ({ default: m.ThemeSettingsPage })),
);

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'simulator',
        element: (
          <RequirePermission permission={Permission.LOAN_SIMULATE}>
            <SimulatorPage />
          </RequirePermission>
        ),
      },
      {
        path: 'products',
        element: (
          <RequirePermission permission={Permission.PRODUCT_READ}>
            <ProductsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'settings/theme',
        element: (
          <RequirePermission permission={Permission.PARAMETER_MANAGE}>
            <ThemeSettingsPage />
          </RequirePermission>
        ),
      },
      { path: '*', element: <DashboardPage /> },
    ],
  },
]);
