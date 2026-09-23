export const PAYMENT_TYPES = [
  "membresía",
  "curso",
  "carnet",
  "multa",
  "congreso",
  "reservaciones",
] as const;

export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_STATUSES = [
  "pending_payment",
  "pending_review",
  "approved",
  "rejected",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = ["al_dia", "gracia", "vencida", "sin_historial"] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BALANCE_STATUSES = ["al_dia", "saldo_pendiente"] as const;

export type BalanceStatus = (typeof BALANCE_STATUSES)[number];

export const AGREEMENT_STATUSES = ["none", "sent", "partial", "uploaded"] as const;

export type AgreementStatus = (typeof AGREEMENT_STATUSES)[number];

export type RenewalPlan = "monthly" | "yearly";

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  membresía: "Membresía",
  curso: "Curso",
  carnet: "Carnet",
  multa: "Multa",
  congreso: "Congreso",
  reservaciones: "Reservaciones",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_payment: "Pendiente de pago",
  pending_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  al_dia: "Al día",
  gracia: "En gracia",
  vencida: "Vencida",
  sin_historial: "Sin historial",
};

export const BALANCE_STATUS_LABELS: Record<BalanceStatus, string> = {
  al_dia: "Al día",
  saldo_pendiente: "Saldo pendiente",
};

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  none: "Sin enviar",
  sent: "Enviado",
  partial: "Parcial",
  uploaded: "Subido",
};

export const RENEWAL_PLAN_LABELS: Record<RenewalPlan, string> = {
  monthly: "Mensual USD 10",
  yearly: "Anual USD 120",
};

export const MONTHLY_FEE = "10.00";
export const YEARLY_FEE = "120.00";

export const PAYMENT_METHODS = ["transferencia", "deposito", "efectivo", "tarjeta"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transferencia: "Transferencia",
  deposito: "Depósito",
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
};

export const MEMBERSHIP_PERIODS = ["this_month", "this_year"] as const;

export type MembershipPeriod = (typeof MEMBERSHIP_PERIODS)[number];

export const MEMBERSHIP_PERIOD_LABELS: Record<MembershipPeriod, string> = {
  this_month: "Este mes",
  this_year: "Este año",
};

export interface Payment {
  id: number;
  user_id: number;
  member_name?: string;
  identifier?: string;
  type: string;
  description: string;
  reference?: string;
  amount: string;
  currency?: string;
  date_register: string;
  last_digits: string;
  trans_id?: string;
  status: PaymentStatus | string;
  voucher_url: string | null;
  admin_observation?: string | null;
  plan?: RenewalPlan | null;
  created_at: string;
}

export interface PaymentWriteInput {
  type: PaymentType;
  description: string;
  amount: string;
  date_register: string;
  last_digits?: string;
  trans_id?: string;
}

export interface OpenPayment {
  id: number;
  status: PaymentStatus | string;
  amount: string;
  plan: RenewalPlan | null;
  description: string;
  date_register: string;
  voucher_url: string | null;
  admin_observation: string | null;
}

export interface SubscriptionSummary {
  coverage_until: string | null;
  credit_balance: string;
  status: SubscriptionStatus | string;
  grace_days?: number;
  days_overdue: number;
  last_payment_at?: string | null;
  pending_balance?: string;
  balance_status?: BalanceStatus | string;
}

export interface MemberSubscriptionRow {
  user_id: number;
  member_name: string;
  identifier: string;
  coverage_until: string | null;
  credit_balance: string;
  status: SubscriptionStatus | string;
  days_overdue: number;
  last_payment_at: string | null;
  payments_count: number;
  open_payment_status: PaymentStatus | string | null;
  enrolled_on?: string | null;
  first_renewal_on?: string | null;
  pending_balance?: string;
  balance_status?: BalanceStatus | string;
  agreement_status?: AgreementStatus | string;
  agreement_sent_at?: string | null;
  has_signed_authorization?: boolean;
  has_identity_document?: boolean;
  email?: string;
  state_id?: number;
}

export interface PendingVoucher {
  id: number;
  user_id: number;
  member_name: string;
  amount: string;
  plan: RenewalPlan | null;
  status: PaymentStatus | string;
  voucher_url: string | null;
  date_register: string;
  created_at: string;
}

export interface AffiliationPaymentRow {
  user_id: number;
  member_name: string;
  amount: string;
  status: string;
  voucher_url: string | null;
  created_at: string;
}

export interface PaginatedPayments {
  items: Payment[];
  page: number;
  page_size: number;
  total: number;
}

export interface PaginatedSubscriptions {
  items: MemberSubscriptionRow[];
  page: number;
  page_size: number;
  total: number;
}

export interface MembershipPaymentsAdminResponse {
  pending_vouchers: PendingVoucher[];
  subscriptions: PaginatedSubscriptions;
  affiliations: AffiliationPaymentRow[];
}

export interface MemberPaymentsAdminResponse {
  member: {
    user_id: number;
    names: string;
    lastname: string;
  };
  items: Payment[];
  subscription: SubscriptionSummary | MemberSubscriptionRow | null;
}

export interface RenewalPaymentInfo {
  bank_name: string;
  account_type: string;
  account_number: string;
  account_holder: string;
  account_ruc: string;
  qr_payload: string;
}

export interface MyPaymentsResponse {
  items: Payment[];
  open_payment: OpenPayment | null;
  subscription: SubscriptionSummary | null;
  payment_info: RenewalPaymentInfo;
}

export interface AdminPaymentsQuery {
  page: number;
  pageSize: number;
  q?: string;
  type?: string;
  status?: string;
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "date_register" | "total" | "created_at" | "names";
  sortDir?: "asc" | "desc";
}

export interface MembershipPaymentsQuery {
  page: number;
  pageSize: number;
  q?: string;
  subscriptionStatus?: SubscriptionStatus | "";
  balanceStatus?: BalanceStatus | "";
  agreementStatus?: AgreementStatus | "";
  period?: MembershipPeriod | "";
}

export interface AdminPaymentStats {
  payments_total: number;
  approved_count: number;
  approved_month: number;
  approved_prev_month: number;
  pending_count: number;
  pending_month: number;
  pending_prev_month: number;
  members_total: number;
  members_al_dia: number;
  members_gracia: number;
  members_vencidas: number;
  members_sin_historial: number;
  pending_balance_total: string;
}

export interface SendDebitAgreementResponse {
  user_id: number;
  email: string;
  pending_balance: string;
  agreement_status: AgreementStatus | string;
  expires_at: string;
  message: string;
}

export interface PublicDebitAgreement {
  member_name: string;
  identifier: string;
  pending_balance: string;
  has_signed_authorization: boolean;
  has_identity_document: boolean;
  status: AgreementStatus | string;
  expires_at: string;
}

export interface PublicAgreementDocumentsResponse {
  status: AgreementStatus | string;
  has_signed_authorization: boolean;
  has_identity_document: boolean;
  message: string;
}

export interface PaymentWriteResponse {
  id?: number;
  payment?: Payment;
  subscription?: SubscriptionSummary | MemberSubscriptionRow | null;
  pending_payment?: Payment;
  open_payment?: OpenPayment;
}

export function paymentTypeLabel(type: string): string {
  if (type in PAYMENT_TYPE_LABELS) {
    return PAYMENT_TYPE_LABELS[type as PaymentType];
  }
  if (type === "inscripcion") {
    return "Inscripción";
  }
  return type;
}

export function paymentStatusLabel(status: string): string {
  if (status in PAYMENT_STATUS_LABELS) {
    return PAYMENT_STATUS_LABELS[status as PaymentStatus];
  }
  return status;
}

export function subscriptionStatusLabel(status: string): string {
  if (status in SUBSCRIPTION_STATUS_LABELS) {
    return SUBSCRIPTION_STATUS_LABELS[status as SubscriptionStatus];
  }
  return status;
}

export function balanceStatusLabel(status: string): string {
  if (status in BALANCE_STATUS_LABELS) {
    return BALANCE_STATUS_LABELS[status as BalanceStatus];
  }
  return status;
}

export function agreementStatusLabel(status: string): string {
  if (status in AGREEMENT_STATUS_LABELS) {
    return AGREEMENT_STATUS_LABELS[status as AgreementStatus];
  }
  return status;
}

export function formatUsd(amount: string | number): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(value)) {
    return `${amount} US$`;
  }
  return `${value.toFixed(2)} US$`;
}

export function paymentMethodFromDigits(lastDigits: string | null | undefined): PaymentMethod {
  const value = (lastDigits || "").trim().toLowerCase();
  if (value === "deposito" || value === "depósito") {
    return "deposito";
  }
  if (value === "efectivo") {
    return "efectivo";
  }
  if (value === "tarjeta" || (/^\d{1,4}$/.test(value) && value !== "any")) {
    return "tarjeta";
  }
  return "transferencia";
}

export function formatPaymentMethod(lastDigits: string | null | undefined): string {
  const method = paymentMethodFromDigits(lastDigits);
  if (method === "tarjeta" && lastDigits && /^\d{1,4}$/.test(lastDigits)) {
    return `**** ${lastDigits}`;
  }
  return PAYMENT_METHOD_LABELS[method];
}

export function memberInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return "—";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function todayRegisterDate(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

export function isoToRegisterDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
}

export function registerDateToIso(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) {
    return value;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function formatIsoDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
}

export function isOpenMembershipStatus(status: string): boolean {
  return status === "pending_payment" || status === "pending_review";
}

export function memberNeedsRenewal(
  subscription: SubscriptionSummary | null,
  openPayment: OpenPayment | null,
): boolean {
  if (openPayment?.status === "pending_review" || openPayment?.status === "pending_payment") {
    return true;
  }
  if (!subscription) {
    return false;
  }
  return subscription.status === "vencida" || subscription.status === "gracia";
}

export function paymentTitle(payment: Payment): string {
  return payment.reference?.trim() || payment.description || "Pago";
}
