import { download, request, upload } from './http';
import type {
  CollectionAccount,
  CustomerActivity,
  CustomerNote,
  CustomerReference,
  CustomerRequest,
  CustomerResponse,
  CustomerSummary,
  CustomerUpdateRequest,
  EarningsResponse,
  LoanRequestBody,
  LoanResponse,
  BackupImportResult,
  LendingCharges,
  LendingSettings,
  LoanIncrease,
  LoginRequest,
  PaymentBehavior,
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
  SellerCategories,
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
  changeProductVisibility: (id: string, sellerVisible: boolean) =>
    request<ProductResponse>(`/api/v1/products/${id}/visibility`, {
      method: 'PATCH',
      body: { sellerVisible },
    }),
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
  /**
   * Sin monto se cobra lo que falta; con menos, es un abono parcial. {@code offline}: referencia y
   * hora real de un cobro hecho sin conexion (el servidor ignora un envio repetido).
   */
  collectInstallment: (
    id: string,
    number: number,
    amount?: number,
    offline?: { reference: string; collectedAt: string },
  ) =>
    request<LoanResponse>(`/api/v1/loans/${id}/installments/${number}/collect`, {
      method: 'POST',
      body: amount == null && !offline ? undefined : { amount, ...offline },
    }),
  settleLoan: (id: string) =>
    request<LoanResponse>(`/api/v1/loans/${id}/settle`, { method: 'POST' }),
  loanIncreases: (id: string) => request<LoanIncrease[]>(`/api/v1/loans/${id}/increases`),
  previewIncrease: (id: string, extraInstallments: number) =>
    request<{ extraPrincipal: number }>(
      `/api/v1/loans/${id}/increases/preview?extraInstallments=${extraInstallments}`,
    ),
  requestIncrease: (id: string, extraInstallments: number) =>
    request<LoanIncrease>(`/api/v1/loans/${id}/increases`, {
      method: 'POST',
      body: { extraInstallments },
    }),
  approveIncrease: (id: string, increaseId: string) =>
    request<LoanIncrease>(`/api/v1/loans/${id}/increases/${increaseId}/approve`, {
      method: 'POST',
    }),
  rejectIncrease: (id: string, increaseId: string, reason: string) =>
    request<LoanIncrease>(`/api/v1/loans/${id}/increases/${increaseId}/reject`, {
      method: 'POST',
      body: { reason },
    }),
  lendingCharges: () => request<LendingCharges>('/api/v1/settings/lending/charges'),
  exportBackup: () => download('/api/v1/admin/backup/export', 'latk-respaldo.zip'),
  importBackup: (file: File) => upload<BackupImportResult>('/api/v1/admin/backup/import', file),
  lendingSettings: () => request<LendingSettings>('/api/v1/settings/lending'),
  changeLendingSettings: (body: Omit<LendingSettings, 'updatedAt' | 'updatedByName'>) =>
    request<LendingSettings>('/api/v1/settings/lending', { method: 'PUT', body }),
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
  sellerCategories: (sellerId: string) =>
    request<SellerCategories>(`/api/v1/sellers/${sellerId}/categories`),
  assignSellerCategories: (sellerId: string, productIds: string[]) =>
    request<SellerCategories>(`/api/v1/sellers/${sellerId}/categories`, {
      method: 'PUT',
      body: { productIds },
    }),
  resetSellerCategories: (sellerId: string) =>
    request<SellerCategories>(`/api/v1/sellers/${sellerId}/categories`, { method: 'DELETE' }),
  deleteProduct: (id: string) => request<void>(`/api/v1/products/${id}`, { method: 'DELETE' }),
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
  customerBehavior: (customerId: string) =>
    request<PaymentBehavior>(`/api/v1/customers/${customerId}/behavior`),
  customerNotes: (customerId: string) =>
    request<CustomerNote[]>(`/api/v1/customers/${customerId}/notes`),
  addCustomerNote: (customerId: string, text: string) =>
    request<CustomerNote>(`/api/v1/customers/${customerId}/notes`, {
      method: 'POST',
      body: { text },
    }),
  customerReferences: (customerId: string) =>
    request<CustomerReference[]>(`/api/v1/customers/${customerId}/references`),
  addCustomerReference: (customerId: string, body: Omit<CustomerReference, 'id'>) =>
    request<CustomerReference>(`/api/v1/customers/${customerId}/references`, {
      method: 'POST',
      body,
    }),
  removeCustomerReference: (customerId: string, referenceId: string) =>
    request<void>(`/api/v1/customers/${customerId}/references/${referenceId}`, {
      method: 'DELETE',
    }),

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
  customerBehavior: (id: string) => ['customerBehavior', id] as const,
  lendingSettings: ['lendingSettings'] as const,
  lendingCharges: ['lendingCharges'] as const,
  loanIncreases: (id: string) => ['loanIncreases', id] as const,
  customerNotes: (id: string) => ['customerNotes', id] as const,
  customerReferences: (id: string) => ['customerReferences', id] as const,
  loans: ['loans'] as const,
  sellers: ['sellers'] as const,
  sellerCategories: (id: string) => ['sellerCategories', id] as const,
  seller: (id: string) => ['seller', id] as const,
  mySellerProfile: ['mySellerProfile'] as const,
  collectionAccount: ['collectionAccount'] as const,
  notifications: ['notifications'] as const,
  portfolioStats: ['portfolioStats'] as const,
  myQuota: ['quota', 'me'] as const,
  quotas: ['quota', 'all'] as const,
  loan: (id: string) => ['loan', id] as const,
};
