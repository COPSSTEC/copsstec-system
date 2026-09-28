import { authorizedFetch } from "@/modules/auth/infrastructure/authorized-fetch";
import type {
  AffiliationForm,
  ApprovalPreview,
  MembershipStatus,
  PaymentInfo,
} from "@/modules/membership/domain/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiErrorBody {
  detail?: string | { message?: string; code?: string };
}

export class MembershipApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "MembershipApiError";
    this.code = code;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  if (response.status === 413) {
    throw new MembershipApiError(
      "Los archivos superan el límite del servidor. Cada PDF debe pesar máximo 8 MB.",
    );
  }

  let message = "No fue posible completar la solicitud.";
  let code: string | undefined;
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (typeof body.detail === "string") {
      message = body.detail;
    } else if (body.detail && typeof body.detail === "object") {
      message = body.detail.message || message;
      code = body.detail.code;
    }
  } catch {
    message = response.statusText || message;
  }
  throw new MembershipApiError(message, code);
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function toIsoDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
}

export async function registerAffiliation(
  form: AffiliationForm,
  photo: File,
): Promise<{ access_token: string; refresh_token?: string; payment: { status: string } }> {
  const body = new FormData();
  body.append("names", form.names.trim());
  body.append("lastname", form.lastname.trim());
  body.append("identifier", form.identifier.trim());
  body.append("email", form.email.trim());
  body.append("birtday", toIsoDate(form.birtday.trim()));
  body.append("blood_type", form.blood_type);
  body.append("gender", form.gender);
  body.append("mobile_phone", form.mobile_phone.trim());
  body.append("fixed_phone", form.fixed_phone.trim());
  body.append("province", form.province);
  body.append("city", form.city);
  body.append("street_principal", form.street_principal.trim());
  body.append("street_secondary", form.street_secondary.trim());
  body.append("title_academic", form.title_academic.trim());
  body.append("cod_senescyt", form.cod_senescyt.trim());
  body.append("fourth_title", form.fourth_title.trim());
  body.append("codigo_senescyt_cuarto", form.codigo_senescyt_cuarto.trim());
  body.append("accept_birthday_notifications", String(form.accept_birthday_notifications));
  body.append("accept_data_policy", String(form.accept_data_policy));
  body.append("photo", photo);

  const response = await fetch(`${API_URL}/api/membership/register`, {
    method: "POST",
    body,
  });
  return parseResponse(response);
}

export async function getMembershipStatus(token: string): Promise<MembershipStatus> {
  const response = await authorizedFetch(`${API_URL}/api/membership/status`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<MembershipStatus>(response);
}

export async function getPaymentInfo(token: string): Promise<PaymentInfo> {
  const response = await authorizedFetch(`${API_URL}/api/membership/payment-info`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<PaymentInfo>(response);
}

export async function uploadPaymentVoucher(
  token: string,
  file: File,
): Promise<{ status: string; message: string; gate?: string }> {
  const body = new FormData();
  body.append("voucher", file);
  const response = await authorizedFetch(`${API_URL}/api/membership/payment-voucher`, {
    method: "POST",
    headers: authHeaders(token),
    body,
  });
  return parseResponse(response);
}

export async function downloadMembershipInvoice(token: string): Promise<void> {
  const response = await authorizedFetch(`${API_URL}/api/membership/invoice`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    await parseResponse<void>(response);
    return;
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "factura-afiliacion.pdf";
  link.click();
  window.URL.revokeObjectURL(url);
}

export async function saveBankDetails(
  token: string,
  details: { account_type: string; account_number: string; bank_name: string; debit_plan: string },
): Promise<MembershipStatus> {
  const response = await authorizedFetch(`${API_URL}/api/membership/bank-details`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  return parseResponse<MembershipStatus>(response);
}

async function downloadPdfFile(token: string, path: string, filename: string): Promise<void> {
  const response = await authorizedFetch(`${API_URL}${path}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    await parseResponse<void>(response);
    return;
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export async function downloadAuthorizationPdf(token: string): Promise<void> {
  await downloadPdfFile(token, "/api/membership/authorization-pdf", "autorizacion-debito-copsstec.pdf");
}

export async function downloadSolicitudPdf(token: string): Promise<void> {
  await downloadPdfFile(token, "/api/membership/solicitud-pdf", "solicitud-afiliacion-copsstec.pdf");
}

export async function downloadAffiliationCommitmentPdf(token: string): Promise<void> {
  await downloadPdfFile(token, "/api/membership/compromiso-pdf", "compromiso-afiliacion-copsstec.pdf");
}

export interface CommitmentVerification {
  valid: boolean;
  document_code: string;
  document_version: string;
  hash: string;
  issued_at: string;
  issued_at_label: string;
  period_start: string;
  period_end: string;
  names: string;
  identifier: string;
  email: string;
  phone: string;
  member_number: string;
  debit_plan_label: string;
  status: string;
}

export async function getCommitmentVerification(digest: string): Promise<CommitmentVerification> {
  const response = await fetch(`${API_URL}/api/membership/commitment-verify/${encodeURIComponent(digest)}`, {
    cache: "no-store",
  });
  if (response.status === 404) {
    throw new MembershipApiError("Este compromiso no consta en el registro de COPSSTEC.");
  }
  return parseResponse<CommitmentVerification>(response);
}

async function snapshotPdf(file: File): Promise<File> {
  const bytes = await file.arrayBuffer();
  return new File([bytes], file.name, {
    type: file.type || "application/pdf",
    lastModified: Date.now(),
  });
}

function uploadAbortedError(error: unknown): MembershipApiError {
  const message = error instanceof Error ? error.message : String(error);
  if (/failed to fetch|networkerror|load failed|upload_file_changed/i.test(message)) {
    return new MembershipApiError(
      "El navegador canceló la subida porque el PDF cambió en el disco. Vuelve a seleccionar los archivos e inténtalo de nuevo.",
    );
  }
  return error instanceof MembershipApiError
    ? error
    : new MembershipApiError(message || "No se pudieron enviar los documentos.");
}

export async function uploadOnboardingDocuments(
  token: string,
  files: {
    signedAuthorization?: File;
    identityDocument?: File;
    signedSolicitud?: File;
    acceptedAffiliationYear?: boolean;
  },
): Promise<{
  status: string;
  has_signed_authorization: boolean;
  has_identity_document: boolean;
  has_signed_solicitud?: boolean;
  accepted_affiliation_year?: boolean;
  gate: string;
  message: string;
}> {
  const signedAuthorization = files.signedAuthorization
    ? await snapshotPdf(files.signedAuthorization)
    : undefined;
  const identityDocument = files.identityDocument
    ? await snapshotPdf(files.identityDocument)
    : undefined;
  const signedSolicitud = files.signedSolicitud ? await snapshotPdf(files.signedSolicitud) : undefined;

  const parts: Array<{
    signedAuthorization?: File;
    identityDocument?: File;
    signedSolicitud?: File;
    acceptedAffiliationYear?: boolean;
  }> = [];
  if (signedAuthorization) {
    parts.push({ signedAuthorization });
  }
  if (identityDocument) {
    parts.push({ identityDocument });
  }
  if (signedSolicitud) {
    parts.push({ signedSolicitud });
  }
  if (files.acceptedAffiliationYear) {
    if (parts.length > 0) {
      parts[parts.length - 1] = { ...parts[parts.length - 1], acceptedAffiliationYear: true };
    } else {
      parts.push({ acceptedAffiliationYear: true });
    }
  }
  if (parts.length === 0) {
    parts.push({});
  }

  let last = await postOnboardingDocuments(token, parts[0]);
  for (const part of parts.slice(1)) {
    last = await postOnboardingDocuments(token, part);
  }
  return last;
}

async function postOnboardingDocuments(
  token: string,
  files: {
    signedAuthorization?: File;
    identityDocument?: File;
    signedSolicitud?: File;
    acceptedAffiliationYear?: boolean;
  },
): Promise<{
  status: string;
  has_signed_authorization: boolean;
  has_identity_document: boolean;
  has_signed_solicitud?: boolean;
  accepted_affiliation_year?: boolean;
  gate: string;
  message: string;
}> {
  const body = new FormData();
  if (files.signedAuthorization) {
    body.append("signed_authorization", files.signedAuthorization);
  }
  if (files.identityDocument) {
    body.append("identity_document", files.identityDocument);
  }
  if (files.signedSolicitud) {
    body.append("signed_solicitud", files.signedSolicitud);
  }
  body.append("accepted_affiliation_year", String(Boolean(files.acceptedAffiliationYear)));
  try {
    const response = await authorizedFetch(`${API_URL}/api/membership/onboarding-documents`, {
      method: "POST",
      headers: authHeaders(token),
      body,
    });
    return await parseResponse(response);
  } catch (error) {
    throw uploadAbortedError(error);
  }
}

export async function getApprovalPreview(token: string, memberId: number): Promise<ApprovalPreview> {
  const response = await authorizedFetch(`${API_URL}/api/members/${memberId}/approval-preview`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<ApprovalPreview>(response);
}

export async function approveMember(
  token: string,
  memberId: number,
  emailCorp: string,
): Promise<{ message: string; login_email: string }> {
  const response = await authorizedFetch(`${API_URL}/api/members/${memberId}/approve`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ email_corp: emailCorp }),
  });
  return parseResponse(response);
}

export async function downloadOnboardingDocument(
  token: string,
  memberId: number,
  kind: "authorization" | "identity" | "voucher" | "solicitud",
): Promise<void> {
  const filenames = {
    authorization: "autorizacion-firmada.pdf",
    identity: "cedula.pdf",
    voucher: "comprobante",
    solicitud: "solicitud-firmada.pdf",
  };
  const response = await authorizedFetch(`${API_URL}/api/members/${memberId}/onboarding-documents/${kind}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    await parseResponse<void>(response);
    return;
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filenames[kind];
  link.click();
  window.URL.revokeObjectURL(url);
}

export function mediaUrl(path: string | null): string | null {
  if (!path) {
    return null;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
