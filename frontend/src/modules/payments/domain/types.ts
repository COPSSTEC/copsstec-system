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

export const RENEWAL_PLAN_LABELS: Record<RenewalPlan, string> = {
  monthly: "Mensual USD 10",
  yearly: "Anual USD 120",
};

export const MONTHLY_FEE = "10.00";
export const YEARLY_FEE = "120.00";

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

export function formatUsd(amount: string | number): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(value)) {
    return `${amount} US$`;
  }
  return `${value.toFixed(2)} US$`;
}

export function formatPaymentMethod(lastDigits: string | null | undefined): string {
  if (!lastDigits || lastDigits === "any" || lastDigits === "NA") {
    return "Transferencia";
  }
  return `**** **** **** ${lastDigits}`;
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

export function paymentTitle(payment: Payment): string {
  return payment.reference?.trim() || payment.description || "Pago";
}
