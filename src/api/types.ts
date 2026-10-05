// Contratos de la API v1 (espejo de los DTO del backend).
// Cuando el backend corra, se pueden regenerar desde /latk-api/api-docs con openapi-typescript.

export type PaymentFrequency = 'WEEKLY' | 'MONTHLY';
export type ThemeRadius = 'XS' | 'SM' | 'MD' | 'LG' | 'XL';
export type ColorSchemeSetting = 'LIGHT' | 'DARK' | 'AUTO';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
}

export interface ProductRequest {
  name: string;
  frequency: PaymentFrequency;
  ratePerPeriod: number;
  allowedAmounts: number[];
  allowedInstallments: number[];
  graceDays: number;
  lateFeeRate: number;
  installmentsToDefault: number;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface ProductResponse extends Required<ProductRequest> {
  id: string;
  active: boolean;
  availableToday: boolean;
  createdAt: string;
}

export interface SimulationRequest {
  productId: string;
  amount: number;
  installments: number;
  firstDueDate?: string | null;
}

export interface InstallmentView {
  number: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface SimulationResponse {
  principal: number;
  ratePerPeriod: number;
  frequency: PaymentFrequency;
  installments: number;
  installmentAmount: number;
  totalToRepay: number;
  totalInterest: number;
  schedule: InstallmentView[];
}

export interface OfferOption {
  amount: number;
  installments: number;
  installmentAmount: number;
  totalToRepay: number;
  /** Solo presente si el vendedor confirmo su contrasena. */
  commissionPerInstallment?: number;
  /** Ganancia en todo el prestamo: comision por cuota x cantidad de cuotas. */
  totalCommission?: number;
}

export interface ProductOffer {
  productId: string;
  productName: string;
  frequency: PaymentFrequency;
  ratePerPeriod: number;
  options: OfferOption[];
}

export interface ThemeTokens {
  primaryColor: string;
  accentColor: string;
  successColor: string;
  brandDeepColor: string;
  darkBackground: string;
  lightBackground: string;
  radius: ThemeRadius;
  fontFamily: string;
  defaultColorScheme: ColorSchemeSetting;
}

export interface ThemeResponse extends ThemeTokens {
  customized: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

/** Error RFC 7807 que devuelve el backend. */
export interface ProblemDetail {
  status: number;
  title?: string;
  detail?: string;
  validationErrors?: { field: string; message: string }[];
}
