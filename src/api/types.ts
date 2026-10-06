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

/** Categoria del producto, de menor a mayor monto (y riesgo). */
export type ProductTier =
  'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'EMERALD' | 'DIAMOND';

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
  /** Con categoria, ratePerPeriod es el recargo que se suma a la tasa base por cuotas. */
  tier?: ProductTier | null;
  sellerVisible?: boolean;
}

export interface ProductResponse extends Omit<
  Required<ProductRequest>,
  'ratePerPeriod' | 'tier' | 'sellerVisible'
> {
  /** Ausente para vendedores. Con categoria es el recargo de la categoria. */
  ratePerPeriod?: number;
  tier?: ProductTier;
  tierLabel?: string;
  /** false: existe pero los vendedores no lo ven. */
  sellerVisible: boolean;
  /** Tasa efectiva por cantidad de cuotas ("8" -> 0.17). Ausente para vendedores. */
  ratesByInstallments?: Record<string, number>;
  id: string;
  active: boolean;
  availableToday: boolean;
  createdAt: string;
}

/** Categorias que puede ofrecer un vendedor. restricted false: usa las de por defecto. */
export interface SellerCategories {
  sellerId: string;
  restricted: boolean;
  productIds: string[];
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
  /** Ausente para vendedores: no ven la tasa. */
  ratePerPeriod?: number;
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
  /** Tasa de esta combinacion. Ausente para vendedores. */
  ratePerPeriod?: number;
}

export interface ProductOffer {
  productId: string;
  productName: string;
  frequency: PaymentFrequency;
  /** Tasa unica de los productos sin categoria. Ausente para vendedores. */
  ratePerPeriod?: number;
  tier?: ProductTier;
  tierLabel?: string;
  /** Recargo de la categoria. Ausente para vendedores. */
  surcharge?: number;
  sellerVisible: boolean;
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
  /** Codigo estable de algunos 409 (por ejemplo QUOTA_EXCEEDED) y sus datos. */
  code?: string;
  [extra: string]: unknown;
}

export interface AddressDto {
  street: string;
  number: string;
  apartment?: string | null;
  city: string;
  province: string;
  postalCode?: string | null;
}

export interface CustomerRequest {
  firstName: string;
  lastName: string;
  dni: string;
  cuil: string;
  birthDate: string;
  phone: string;
  email?: string | null;
  address: AddressDto;
  bankAccount: { cbu: string; alias?: string | null; bankName?: string | null };
  occupation?: string | null;
  monthlyIncome?: number | null;
  notes?: string | null;
}

export interface CustomerResponse extends Omit<CustomerRequest, 'bankAccount'> {
  id: string;
  sellerId: string;
  bankAccount: { cbu: string; alias: string | null; bankName: string | null; virtual: boolean };
  createdAt: string;
  /** Se reenvia al modificar: si otro lo cambio antes, el backend responde 409. */
  version: number;
}

export interface CustomerUpdateRequest {
  version: number;
  data: CustomerRequest;
}

export interface CustomerSummary {
  id: string;
  fullName: string;
  dni: string;
  phone: string;
  city: string;
}

export type LoanStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'COMPLETED';

export type InstallmentStatus = 'PENDING' | 'COLLECTED';

/** Cuota real (despues del desembolso). */
export interface InstallmentResponse {
  number: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  remainingBalance: number;
  status: InstallmentStatus;
  /** Pendiente con el vencimiento ya pasado. */
  overdue: boolean;
  collectedAt?: string | null;
  collectedByName?: string | null;
  /** Pendiente y con telefono del cliente: link wa.me con el recordatorio ya escrito. */
  reminderUrl?: string | null;
}

export interface InstallmentEventResponse {
  number: number;
  type: 'COLLECTED' | 'REVERTED';
  /** Cobro de una cuota que todavia no vencia. */
  advance: boolean;
  actorName: string;
  reason?: string | null;
  occurredAt: string;
}

export interface LoanRequestBody {
  customerId: string;
  productId: string;
  amount: number;
  installments: number;
  notes?: string | null;
  /** Confirma usar el margen extra cuando el prestamo supera el cupo del mes. */
  useExtraQuota?: boolean;
}

/** El backend nunca envia el % de comision del vendedor. */
export interface LoanResponse {
  id: string;
  sellerName: string;
  customerId: string;
  customerName: string;
  customerDni: string | null;
  productName: string;
  /** Categoria del producto al pedir el prestamo; ausente si no tenia. */
  productTier?: ProductTier;
  frequency: PaymentFrequency;
  /** Ausente para vendedores: no ven la tasa. */
  ratePerPeriod?: number;
  principal: number;
  installments: number;
  installmentAmount: number;
  totalToRepay: number;
  status: LoanStatus;
  notes?: string | null;
  requestedAt: string;
  /** true si se aprobo sola por estar bajo el limite de monto. */
  autoApproved: boolean;
  decidedByName?: string | null;
  decidedAt?: string | null;
  /** Motivo del rechazo, o la regla de la aprobacion automatica. */
  decisionReason?: string | null;
  disbursedOn?: string | null;
  disbursedByName?: string | null;
  disbursementReference?: string | null;
  /** Avance de cobro; solo con cuotas generadas. */
  installmentsCollected?: number | null;
  nextDueDate?: string | null;
  /** Ultimo cobro registrado (ISO); ausente si todavia no se cobro ninguna cuota. */
  lastPaymentAt?: string | null;
  /** Solo en el detalle: plan estimado (el definitivo se fija al desembolsar). */
  estimatedSchedule?: InstallmentView[];
  /** Solo en el detalle, despues del desembolso: cuotas reales. */
  schedule?: InstallmentResponse[];
  /** Solo en el detalle: cobros y reversiones, del mas viejo al mas nuevo. */
  history?: InstallmentEventResponse[];
}

/** Ganancias del vendedor (en pesos; nunca el % de comision). */
export interface EarningsResponse {
  /** YYYY-MM */
  currentMonth: string;
  earnedThisMonth: number;
  expectedThisMonth: number;
  earnedTotal: number;
  pendingTotal: number;
  months: {
    month: string;
    earned: number;
    expected: number;
    installmentsCollected: number;
    installmentsPending: number;
  }[];
  loans: {
    loanId: string;
    customerName: string;
    principal: number;
    status: LoanStatus;
    installments: number;
    installmentsCollected: number;
    perInstallment: number;
    earned: number;
    pending: number;
  }[];
}

export interface SellerAddress {
  street: string;
  number: string;
  apartment?: string | null;
  city: string;
  province: string;
  postalCode?: string | null;
}

export interface SellerBankAccount {
  cbu: string;
  alias?: string | null;
  bankName?: string | null;
  /** Solo en respuestas: true si es CVU. */
  virtual?: boolean;
}

/** Lo que el propio vendedor puede editar. */
export interface SellerContactRequest {
  phone: string;
  email: string | null;
  address: SellerAddress | null;
  /** Opcional: sin cuenta el perfil figura incompleto hasta cargarla. */
  bankAccount: SellerBankAccount | null;
}

/** Edicion completa por el administrador. */
export interface SellerDataRequest extends SellerContactRequest {
  firstName: string;
  lastName: string;
  dni: string;
  cuil: string;
}

export interface NewSellerRequest {
  username: string;
  password: string;
  /** 0.05 = 5 % */
  commissionRate: number;
  data: SellerDataRequest;
}

export interface SellerResponse {
  userId: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName: string;
  dni?: string | null;
  cuil?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: SellerAddress | null;
  bankAccount?: SellerBankAccount | null;
  /** Solo para el administrador: en "mis datos" no viene. */
  commissionRate?: number;
  /** 0 a 100 */
  completeness: number;
  missingFields: string[];
  createdAt: string;
  updatedAt: string;
}

/** Cuenta del administrador donde los vendedores transfieren lo cobrado. */
export interface CollectionAccount {
  holderName: string;
  holderCuit?: string | null;
  cbu: string;
  alias?: string | null;
  bankName?: string | null;
  instructions?: string | null;
  virtual?: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
}

export type NotificationTone = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface AppNotification {
  id: string;
  type: string;
  tone: NotificationTone;
  title: string;
  message: string;
  /** Ruta interna a la que lleva. */
  link?: string | null;
  /** Recordatorios de cobro: link wa.me con el mensaje para el cliente. */
  whatsappUrl?: string | null;
  createdAt: string;
  read: boolean;
}

export interface NotificationInbox {
  unreadCount: number;
  items: AppNotification[];
}

export type DelinquencyLevel = 'BIEN' | 'MEDIA' | 'ALTA';

export interface StatsWindow {
  installments: number;
  amount: number;
}

export interface PortfolioStats {
  today: string;
  loansByStatus: Record<LoanStatus, number>;
  lent: number;
  collected: number;
  toCollect: number;
  interestCollected: number;
  /** Solo para quien ve toda la cartera. */
  commissionsGenerated?: number;
  overdue: {
    installments: number;
    amount: number;
    loansWithOverdue: number;
    activeLoans: number;
    ratio: number;
    level: DelinquencyLevel;
  };
  dueNext7Days: StatsWindow;
  collectedThisMonth: StatsWindow;
  dueThisMonth: StatsWindow;
  /** month: YYYY-MM */
  months: { month: string; collected: number; pending: number }[];
  sellers: {
    sellerId: string;
    sellerName: string;
    activeLoans: number;
    lent: number;
    collected: number;
    toCollect: number;
    overdueAmount: number;
    loansWithOverdue: number;
    delinquencyRatio: number;
    level: DelinquencyLevel;
    commissionsGenerated: number;
  }[];
}

export type CustomerActivityType =
  | 'CUSTOMER_REGISTERED'
  | 'CUSTOMER_UPDATED'
  | 'LOAN_REQUESTED'
  | 'LOAN_AUTO_APPROVED'
  | 'LOAN_APPROVED'
  | 'LOAN_REJECTED'
  | 'LOAN_DISBURSED'
  | 'INSTALLMENT_COLLECTED'
  | 'INSTALLMENT_REVERTED'
  | 'LOAN_COMPLETED';

/** Un hecho de la historia del cliente (lo nuevo primero). */
export interface CustomerActivity {
  at: string;
  type: CustomerActivityType;
  /** Ausente en el alta y las modificaciones del cliente. */
  loanId?: string | null;
  productName?: string | null;
  installmentNumber?: number | null;
  amount?: number | null;
  /** Ausente si fue automatico. */
  actorName?: string | null;
  /** Motivo, referencia, notas o, en modificaciones, una linea por campo cambiado. */
  detail?: string | null;
  advance: boolean;
}

/** Cupo mensual de prestamos de un vendedor (su objetivo del mes). */
export interface Quota {
  sellerId: string;
  /** "2026-10" */
  month: string;
  assigned: number;
  extraAllowance: number;
  lent: number;
  remaining: number;
  extraRemaining: number;
  lentPercent: number;
  loans: number;
  toRepay: number;
  repaid: number;
  full: boolean;
  usingExtra: boolean;
  fullyRepaid: boolean;
}

export interface QuotaRequest {
  monthlyAmount: number;
  /** Vacio = margen por defecto del sistema. */
  extraAllowance?: number | null;
}
