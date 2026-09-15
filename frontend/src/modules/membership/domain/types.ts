export const BLOOD_TYPES = [
  "A Rh+ (A positivo)",
  "A Rh- (A negativo)",
  "B Rh+ (B positivo)",
  "B Rh- (B negativo)",
  "O Rh+ (O positivo)",
  "O Rh- (O negativo)",
  "AB Rh+ (AB positivo)",
  "AB Rh- (AB negativo)",
] as const;

export const GENDERS = ["Masculino", "Femenino"] as const;

export type MembershipGate = "payment" | "pending_approval" | "subscription_due" | "none";

export interface MembershipStatus {
  must_complete_payment: boolean;
  must_wait_approval: boolean;
  gate: MembershipGate;
  payment_status: string | null;
  state_id: number;
  personal_email: string;
  login_email: string;
  has_invoice: boolean;
  names: string;
  lastname: string;
  identifier: string;
  must_pay_subscription?: boolean;
  coverage_until?: string | null;
  credit_balance?: string | null;
  days_overdue?: number | null;
  open_payment_status?: string | null;
}

export interface PaymentInfo {
  amount: string | number;
  currency: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  account_holder: string;
  account_ruc: string;
  reference: string;
  qr_payload: string;
}

export interface ApprovalPreview {
  user_id: number;
  names: string;
  lastname: string;
  identifier: string;
  personal_email: string;
  suggested_corporate_email: string;
  payment_status: string;
  voucher_url: string | null;
  amount: string;
}

export interface AffiliationForm {
  names: string;
  lastname: string;
  identifier: string;
  birtday: string;
  blood_type: string;
  gender: string;
  email: string;
  fixed_phone: string;
  mobile_phone: string;
  province: string;
  city: string;
  street_principal: string;
  street_secondary: string;
  title_academic: string;
  cod_senescyt: string;
  fourth_title: string;
  codigo_senescyt_cuarto: string;
  accept_birthday_notifications: boolean;
  accept_data_policy: boolean;
}

export const EMPTY_AFFILIATION_FORM: AffiliationForm = {
  names: "",
  lastname: "",
  identifier: "",
  birtday: "",
  blood_type: "",
  gender: "",
  email: "",
  fixed_phone: "",
  mobile_phone: "",
  province: "",
  city: "",
  street_principal: "",
  street_secondary: "",
  title_academic: "",
  cod_senescyt: "",
  fourth_title: "",
  codigo_senescyt_cuarto: "",
  accept_birthday_notifications: false,
  accept_data_policy: false,
};

export const DATA_POLICY_TITLE = "POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES";

export const DATA_POLICY_BODY = `Por favor leer esta información antes de proceder con el registro

El Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador - COPSSTEC se compromete a garantizar la privacidad y seguridad de los datos personales de sus miembros. En cumplimiento de la Ley Orgánica de Protección de Datos Personales del Ecuador (LOPDP), establecemos la presente política para informar sobre la recolección, uso, almacenamiento y protección de la información personal de nuestros afiliados.

1.- Datos Personales Recopilados
El COPSSTEC recopilará para su tratamiento los siguientes datos personales de sus miembros:
• Nombres completos.
• Número de cédula de identidad.
• Fecha de nacimiento.
• Tipo de sangre.
• Correo electrónico.
• Número de teléfono fijo.
• Número de teléfono móvil.
• Dirección de domicilio.
• Profesión y datos laborales relacionados con la Seguridad y Salud en el Trabajo.
• Otros datos que sean necesarios para la gestión de membresía y actividades del Colegio.`;

export function membershipRedirect(gate: MembershipGate): string {
  if (gate === "payment") {
    return "/afiliacion/pago";
  }
  if (gate === "pending_approval") {
    return "/afiliacion/en-revision";
  }
  if (gate === "subscription_due") {
    return "/suscripcion/pendiente";
  }
  return "/dashboard";
}
