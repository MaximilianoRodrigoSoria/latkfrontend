import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { LoginPage } from '../auth/LoginPage';
import { RequireAnyPermission, RequireAuth, RequirePermission } from '../auth/RequireAuth';
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
const CustomersPage = lazy(() =>
  import('../features/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })),
);
const CustomerDetailPage = lazy(() =>
  import('../features/customers/CustomerDetailPage').then((m) => ({
    default: m.CustomerDetailPage,
  })),
);
const LoansPage = lazy(() =>
  import('../features/loans/LoansPage').then((m) => ({ default: m.LoansPage })),
);
const NewLoanPage = lazy(() =>
  import('../features/loans/NewLoanPage').then((m) => ({ default: m.NewLoanPage })),
);
const LoanDetailPage = lazy(() =>
  import('../features/loans/LoanDetailPage').then((m) => ({ default: m.LoanDetailPage })),
);
const EarningsPage = lazy(() =>
  import('../features/earnings/EarningsPage').then((m) => ({ default: m.EarningsPage })),
);
const SellersPage = lazy(() =>
  import('../features/sellers/SellersPage').then((m) => ({ default: m.SellersPage })),
);
const SellerDetailPage = lazy(() =>
  import('../features/sellers/SellerDetailPage').then((m) => ({ default: m.SellerDetailPage })),
);
const MyProfilePage = lazy(() =>
  import('../features/sellers/MyProfilePage').then((m) => ({ default: m.MyProfilePage })),
);
const CollectionAccountPage = lazy(() =>
  import('../features/settings/CollectionAccountPage').then((m) => ({
    default: m.CollectionAccountPage,
  })),
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
        path: 'customers',
        element: (
          <RequireAnyPermission permissions={[Permission.LOAN_READ_OWN, Permission.LOAN_READ_ALL]}>
            <CustomersPage />
          </RequireAnyPermission>
        ),
      },
      {
        path: 'customers/:id',
        element: (
          <RequireAnyPermission permissions={[Permission.LOAN_READ_OWN, Permission.LOAN_READ_ALL]}>
            <CustomerDetailPage />
          </RequireAnyPermission>
        ),
      },
      {
        path: 'loans',
        element: (
          <RequireAnyPermission permissions={[Permission.LOAN_READ_OWN, Permission.LOAN_READ_ALL]}>
            <LoansPage />
          </RequireAnyPermission>
        ),
      },
      {
        path: 'loans/new',
        element: (
          <RequirePermission permission={Permission.LOAN_REQUEST}>
            <NewLoanPage />
          </RequirePermission>
        ),
      },
      {
        path: 'loans/:id',
        element: (
          <RequireAnyPermission permissions={[Permission.LOAN_READ_OWN, Permission.LOAN_READ_ALL]}>
            <LoanDetailPage />
          </RequireAnyPermission>
        ),
      },
      {
        path: 'earnings',
        element: (
          <RequirePermission permission={Permission.COMMISSION_READ_OWN}>
            <EarningsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'sellers',
        element: (
          <RequirePermission permission={Permission.SELLER_MANAGE}>
            <SellersPage />
          </RequirePermission>
        ),
      },
      {
        path: 'sellers/:id',
        element: (
          <RequirePermission permission={Permission.SELLER_MANAGE}>
            <SellerDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: 'profile',
        element: (
          <RequirePermission permission={Permission.PROFILE_MANAGE_OWN}>
            <MyProfilePage />
          </RequirePermission>
        ),
      },
      {
        path: 'settings/collection-account',
        element: (
          <RequirePermission permission={Permission.PARAMETER_MANAGE}>
            <CollectionAccountPage />
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
