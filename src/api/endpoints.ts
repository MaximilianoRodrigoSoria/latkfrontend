import { request } from './http';
import type {
  LoginRequest,
  LoginResponse,
  ProductRequest,
  ProductResponse,
  SimulationRequest,
  SimulationResponse,
  ThemeResponse,
  ThemeTokens,
} from './types';

export const api = {
  login: (body: LoginRequest) =>
    request<LoginResponse>('/api/v1/auth/login', { method: 'POST', body }),

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

  theme: () => request<ThemeResponse>('/api/v1/settings/theme'),
  updateTheme: (body: ThemeTokens) =>
    request<ThemeResponse>('/api/v1/settings/theme', { method: 'PUT', body }),
  resetTheme: () => request<ThemeResponse>('/api/v1/settings/theme/reset', { method: 'POST' }),
};

export const queryKeys = {
  products: (onlyAvailable: boolean) => ['products', { onlyAvailable }] as const,
  theme: ['theme'] as const,
};
