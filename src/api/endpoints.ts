import { request } from './http';
import type {
  CollectionAccount,
  CustomerActivity,
  CustomerRequest,
  CustomerResponse,
  CustomerSummary,
  CustomerUpdateRequest,
  EarningsResponse,
  LoanRequestBody,
  LoanResponse,
  LoginRequest,
  LoginResponse,
  NewSellerRequest,
  NotificationInbox,
  PortfolioStats,
  Quota,
  QuotaRequest,
  ProductOffer,
  ProductRequest,
  ProductResponse,
  SellerContactRequest,
  SellerDataRequest,
  SellerResponse,
  SimulationRequest,
  SimulationResponse,
  ThemeResponse,
  ThemeTokens,
} from './types';

export const api = {
  login: (body: LoginRequest) =>
    request<LoginResponse>('/api/v1/auth/login', { method: 'POST', body }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<void>('/api/v1/auth/password', { method: 'POST', body }),

  products: (onlyAvailable: boolean) =>
    request<ProductResponse[]>(`/api/v1/products?onlyAvailable=${onlyAvailable}`),
  createProduct: (body: ProductRequest) =>
    request<ProductResponse>('/api/v1/products', { method: 'POST', body }),
  changeProductStatus: (id: string, active: boolean) =>
    request<ProductResponse>(`/api/v1/products/${id}/status`, {
      method: 'PATCH',
      body: { active },
    }),

  simulate: (body: SimulationRequest) =>
    request<SimulationResponse>('/api/v1/loans/simulations', { method: 'POST', body }),

  offers: () => request<ProductOffer[]>('/api/v1/loans/offers'),
  offersWithCommission: (password: string) =>
    request<ProductOffer[]>('/api/v1/loans/offers/with-commission', {
      method: 'POST',
      body: { password },
    }),

  myEarnings: (password: string) =>
    request<EarningsResponse>('/api/v1/earnings/me', { method: 'POST', body: { password } }),

  customers: (search: string) =>
    request<CustomerSummary[]>(
      `/api/v1/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    ),
  customer: (id: string) => request<CustomerResponse>(`/api/v1/customers/${id}`),
  createCustomer: (body: CustomerRequest) =>
    request<CustomerResponse>('/api/v1/customers', { method: 'POST', body }),
  updateCustomer: (id: string, body: CustomerUpdateRequest) =>
    request<CustomerResponse>(`/api/v1/customers/${id}`, { method: 'PUT', body }),

  loans: () => request<LoanResponse[]>('/api/v1/loans'),
  loan: (id: string) => request<LoanResponse>(`/api/v1/loans/${id}`),
  createLoan: (body: LoanRequestBody) =>
    request<LoanResponse>('/api/v1/loans', { method: 'POST', body }),
  disburseLoan: (id: string, reference: string | null) =>
    request<LoanResponse>(`/api/v1/loans/${id}/disbursement`, {
      method: 'POST',
      body: { reference },
    }),
  collectInstallment: (id: string, number: number) =>
    request<LoanResponse>(`/api/v1/loans/${id}/installments/${number}/collect`, {
      method: 'POST',
    }),
  revertInstallment: (id: string, number: number, reason: string) =>
    request<LoanResponse>(`/api/v1/loans/${id}/installments/${number}/revert`, {
      method: 'POST',
      body: { reason },
    }),
  approveLoan: (id: string) =>
    request<LoanResponse>(`/api/v1/loans/${id}/approve`, { method: 'POST' }),
  rejectLoan: (id: string, reason: string) =>
    request<LoanResponse>(`/api/v1/loans/${id}/reject`, { method: 'POST', body: { reason } }),

  sellers: () => request<SellerResponse[]>('/api/v1/sellers'),
  seller: (id: string) => request<SellerResponse>(`/api/v1/sellers/${id}`),
  createSeller: (body: NewSellerRequest) =>
    request<SellerResponse>('/api/v1/sellers', { method: 'POST', body }),
  updateSeller: (id: string, body: SellerDataRequest) =>
    request<SellerResponse>(`/api/v1/sellers/${id}`, { method: 'PUT', body }),
  setSellerCommission: (id: string, commissionRate: number) =>
    request<unknown>(`/api/v1/sellers/${id}/commission`, {
      method: 'PUT',
      body: { commissionRate },
    }),
  mySellerProfile: () => request<SellerResponse>('/api/v1/sellers/me'),
  updateMySellerProfile: (body: SellerContactRequest) =>
    request<SellerResponse>('/api/v1/sellers/me', { method: 'PUT', body }),

  /** undefined si el administrador todavia no la cargo (204). */
  collectionAccount: () =>
    request<CollectionAccount | undefined>('/api/v1/settings/collection-account'),
  updateCollectionAccount: (body: CollectionAccount) =>
    request<CollectionAccount>('/api/v1/settings/collection-account', { method: 'PUT', body }),

  notifications: (limit = 30) => request<NotificationInbox>(`/api/v1/notifications?limit=${limit}`),
  markNotificationRead: (id: string) =>
    request<void>(`/api/v1/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () =>
    request<void>('/api/v1/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id: string) =>
    request<void>(`/api/v1/notifications/${id}`, { method: 'DELETE' }),
  deleteReadNotifications: () => request<void>('/api/v1/notifications/read', { method: 'DELETE' }),

  customerActivity: (customerId: string) =>
    request<CustomerActivity[]>(`/api/v1/customers/${customerId}/activity`),

  portfolioStats: () => request<PortfolioStats>('/api/v1/stats/portfolio'),

  /** undefined si el vendedor no tiene cupo asignado (204). */
  myQuota: () => request<Quota | undefined>('/api/v1/quotas/me'),
  quotas: () => request<Quota[]>('/api/v1/quotas'),
  assignQuota: (sellerId: string, body: QuotaRequest) =>
    request<Quota>(`/api/v1/sellers/${sellerId}/quota`, { method: 'PUT', body }),
  removeQuota: (sellerId: string) =>
    request<void>(`/api/v1/sellers/${sellerId}/quota`, { method: 'DELETE' }),

  theme: () => request<ThemeResponse>('/api/v1/settings/theme'),
  updateTheme: (body: ThemeTokens) =>
    request<ThemeResponse>('/api/v1/settings/theme', { method: 'PUT', body }),
  resetTheme: () => request<ThemeResponse>('/api/v1/settings/theme/reset', { method: 'POST' }),
};

export const queryKeys = {
  products: (onlyAvailable: boolean) => ['products', { onlyAvailable }] as const,
  theme: ['theme'] as const,
  offers: ['offers'] as const,
  customers: (search: string) => ['customers', { search }] as const,
  customer: (id: string) => ['customer', id] as const,
  customerActivity: (id: string) => ['customerActivity', id] as const,
  loans: ['loans'] as const,
  sellers: ['sellers'] as const,
  seller: (id: string) => ['seller', id] as const,
  mySellerProfile: ['mySellerProfile'] as const,
  collectionAccount: ['collectionAccount'] as const,
  notifications: ['notifications'] as const,
  portfolioStats: ['portfolioStats'] as const,
  myQuota: ['quota', 'me'] as const,
  quotas: ['quota', 'all'] as const,
  loan: (id: string) => ['loan', id] as const,
};
