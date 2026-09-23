import type {
  AdminPaymentStats,
  AdminPaymentsQuery,
  MembershipPaymentsAdminResponse,
  MembershipPaymentsQuery,
  MemberPaymentsAdminResponse,
  MyPaymentsResponse,
  OpenPayment,
  PaymentWriteInput,
  PaymentWriteResponse,
  PaginatedPayments,
  PublicAgreementDocumentsResponse,
  PublicDebitAgreement,
  RenewalPlan,
  SendDebitAgreementResponse,
} from "@/modules/payments/domain/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiErrorBody {
  detail?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  let message = "No fue posible completar la solicitud.";
  try {
    const body = (await response.json()) as ApiErrorBody;
    message = typeof body.detail === "string" ? body.detail : message;
  } catch {
    message = response.statusText || message;
  }
  throw new Error(message);
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function toAdminQuery(query: AdminPaymentsQuery): string {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("page_size", String(query.pageSize));
  params.set("sort_by", query.sortBy ?? "date_register");
  params.set("sort_dir", query.sortDir ?? "desc");

  if (query.q?.trim()) {
    params.set("q", query.q.trim());
  }
  if (query.type) {
    params.set("type", query.type);
  }
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.userId) {
    params.set("user_id", String(query.userId));
  }
  if (query.dateFrom) {
    params.set("date_from", query.dateFrom);
  }
  if (query.dateTo) {
    params.set("date_to", query.dateTo);
  }

  return params.toString();
}

function unwrapOpenPayment(data: OpenPayment | { open_payment: OpenPayment }): OpenPayment {
  if ("open_payment" in data && data.open_payment) {
    return data.open_payment;
  }
  return data as OpenPayment;
}

export async function listAdminPayments(
  token: string,
  query: AdminPaymentsQuery,
): Promise<PaginatedPayments> {
  const response = await fetch(`${API_URL}/api/payments/admin?${toAdminQuery(query)}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<PaginatedPayments>(response);
}

export async function listMembershipPaymentsAdmin(
  token: string,
  query: MembershipPaymentsQuery,
): Promise<MembershipPaymentsAdminResponse> {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("page_size", String(query.pageSize));
  if (query.q?.trim()) {
    params.set("q", query.q.trim());
  }
  if (query.subscriptionStatus) {
    params.set("subscription_status", query.subscriptionStatus);
  }
  if (query.balanceStatus) {
    params.set("balance_status", query.balanceStatus);
  }
  if (query.agreementStatus) {
    params.set("agreement_status", query.agreementStatus);
  }
  if (query.period) {
    params.set("period", query.period);
  }

  const response = await fetch(`${API_URL}/api/payments/admin/membership?${params.toString()}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<MembershipPaymentsAdminResponse>(response);
}

export async function getAdminPaymentStats(token: string): Promise<AdminPaymentStats> {
  const response = await fetch(`${API_URL}/api/payments/admin/stats`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<AdminPaymentStats>(response);
}

export async function listMemberPaymentsAdmin(
  token: string,
  memberId: number,
): Promise<MemberPaymentsAdminResponse> {
  const response = await fetch(`${API_URL}/api/payments/admin/members/${memberId}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<MemberPaymentsAdminResponse>(response);
}

export async function createMemberPayment(
  token: string,
  memberId: number,
  input: PaymentWriteInput,
): Promise<PaymentWriteResponse> {
  const response = await fetch(`${API_URL}/api/payments/admin/members/${memberId}`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<PaymentWriteResponse>(response);
}

export async function updatePayment(
  token: string,
  paymentId: number,
  input: PaymentWriteInput,
): Promise<PaymentWriteResponse> {
  const response = await fetch(`${API_URL}/api/payments/admin/${paymentId}`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<PaymentWriteResponse>(response);
}

export async function deletePayment(token: string, paymentId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/payments/admin/${paymentId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  await parseResponse<void>(response);
}

export async function approvePayment(
  token: string,
  paymentId: number,
): Promise<PaymentWriteResponse> {
  const response = await fetch(`${API_URL}/api/payments/admin/${paymentId}/approve`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<PaymentWriteResponse>(response);
}

export async function rejectPayment(
  token: string,
  paymentId: number,
  observation: string,
): Promise<PaymentWriteResponse> {
  const response = await fetch(`${API_URL}/api/payments/admin/${paymentId}/reject`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ observation }),
  });
  return parseResponse<PaymentWriteResponse>(response);
}

export async function listMyPayments(token: string): Promise<MyPaymentsResponse> {
  const response = await fetch(`${API_URL}/api/payments/me`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<MyPaymentsResponse>(response);
}

export async function createMyRenewal(token: string, plan: RenewalPlan): Promise<OpenPayment> {
  const response = await fetch(`${API_URL}/api/payments/me/renewals`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = await parseResponse<OpenPayment | { open_payment: OpenPayment }>(response);
  return unwrapOpenPayment(data);
}

export async function uploadMyVoucher(
  token: string,
  paymentId: number,
  file: File,
): Promise<PaymentWriteResponse> {
  const body = new FormData();
  body.append("voucher", file);
  const response = await fetch(`${API_URL}/api/payments/me/${paymentId}/voucher`, {
    method: "POST",
    headers: authHeaders(token),
    body,
  });
  return parseResponse<PaymentWriteResponse>(response);
}

export function paymentVoucherUrl(path: string | null): string | null {
  if (!path) {
    return null;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

const INVALID_AGREEMENT_LINK = "Este enlace no es válido o ya expiró";

async function downloadBlob(response: Response, filename: string): Promise<void> {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export type AgreementDocumentKind = "authorization" | "identity";

export async function downloadAdminAgreementDocument(
  token: string,
  memberId: number,
  kind: AgreementDocumentKind,
): Promise<void> {
  const filename =
    kind === "authorization"
      ? `autorizacion-adv-${memberId}.pdf`
      : `cedula-acuerdo-${memberId}.pdf`;
  const headers = authHeaders(token);
  const onboarding = await fetch(
    `${API_URL}/api/members/${memberId}/onboarding-documents/${kind}`,
    { headers },
  );
  if (onboarding.ok) {
    await downloadBlob(onboarding, filename);
    return;
  }
  const agreement = await fetch(`${API_URL}/api/members/${memberId}/debit-agreement/${kind}`, {
    headers,
  });
  if (agreement.ok) {
    await downloadBlob(agreement, filename);
    return;
  }
  if (onboarding.status === 404 && agreement.status === 404) {
    throw new Error("Este miembro aún no ha subido los documentos del acuerdo");
  }
  await parseResponse<void>(agreement.ok ? onboarding : agreement);
}

export async function sendDebitAgreement(
  token: string,
  memberId: number,
): Promise<SendDebitAgreementResponse> {
  const response = await fetch(`${API_URL}/api/payments/admin/members/${memberId}/send-agreement`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<SendDebitAgreementResponse>(response);
}

export async function getPublicAgreement(token: string): Promise<PublicDebitAgreement> {
  const response = await fetch(`${API_URL}/api/payments/agreements/${token}`, {
    cache: "no-store",
  });
  if (response.status === 404) {
    throw new Error(INVALID_AGREEMENT_LINK);
  }
  return parseResponse<PublicDebitAgreement>(response);
}

export async function downloadPublicAgreementPdf(token: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/payments/agreements/${token}/pdf`, {
    cache: "no-store",
  });
  if (response.status === 404) {
    throw new Error(INVALID_AGREEMENT_LINK);
  }
  if (!response.ok) {
    await parseResponse<void>(response);
    return;
  }
  await downloadBlob(response, "autorizacion-debito-adv-copsstec.pdf");
}

export async function uploadPublicAgreementDocuments(
  token: string,
  files: { signedAuthorization?: File; identityDocument?: File },
): Promise<PublicAgreementDocumentsResponse> {
  const body = new FormData();
  if (files.signedAuthorization) {
    body.append("signed_authorization", files.signedAuthorization);
  }
  if (files.identityDocument) {
    body.append("identity_document", files.identityDocument);
  }
  const response = await fetch(`${API_URL}/api/payments/agreements/${token}/documents`, {
    method: "POST",
    body,
  });
  if (response.status === 404) {
    throw new Error(INVALID_AGREEMENT_LINK);
  }
  return parseResponse<PublicAgreementDocumentsResponse>(response);
}
