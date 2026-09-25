import { authorizedFetch } from "@/modules/auth/infrastructure/authorized-fetch";
import type {
  Member,
  MemberListQuery,
  MemberListResponse,
  MemberWriteInput,
} from "@/modules/members/domain/types";

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

function authHeaders(token: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

function toQuery(query: MemberListQuery): string {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("page_size", String(query.pageSize));
  params.set("sort_by", query.sortBy);
  params.set("sort_dir", query.sortDir);

  if (query.q.trim()) {
    params.set("q", query.q.trim());
  }

  const mapping: Record<string, string> = {
    member: "names",
    names: "names",
    lastname: "lastname",
    identifier: "identifier",
    contacts: "email",
    email: "email",
    login_email: "login_email",
    state: "state_id",
    blood_type: "blood_type",
    title_academic: "title_academic",
    level_academic: "level_academic",
    gender: "gender",
    province: "province",
    city: "city",
    fixed_phone: "fixed_phone",
    cod_senescyt: "cod_senescyt",
    birtday_from: "birthday_from",
    birtday_to: "birthday_to",
    date_register_from: "date_register_from",
    date_register_to: "date_register_to",
  };

  for (const [key, value] of Object.entries(query.filters)) {
    if (!value) {
      continue;
    }

    params.set(mapping[key] ?? key, value);
  }

  return params.toString();
}

export async function listMembers(
  token: string,
  query: MemberListQuery,
): Promise<MemberListResponse> {
  const response = await authorizedFetch(`${API_URL}/api/members?${toQuery(query)}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });

  return parseResponse<MemberListResponse>(response);
}

function toWritePayload(input: MemberWriteInput) {
  const fourthTitle = input.fourth_title.trim();
  return {
    names: input.names,
    lastname: input.lastname,
    identifier: input.identifier,
    email: input.email,
    login_email: input.login_email.trim() || null,
    birtday: input.birtday,
    mobile_phone: input.mobile_phone,
    date_register: input.date_register,
    blood_type: input.blood_type,
    fixed_phone: input.fixed_phone,
    title_academic: input.title_academic,
    level_academic: input.level_academic,
    cod_senescyt: input.cod_senescyt,
    linkdink: input.linkdink,
    want_notifications: input.want_notifications,
    is_work: input.is_work,
    foto_id: input.foto_id,
    province: input.province.trim() || null,
    city: input.city.trim() || null,
    street_principal: input.street_principal.trim() || null,
    street_secondary: input.street_secondary.trim() || null,
    gender: input.gender.trim() || null,
    type_profile: input.type_profiles.join(",") || "miembro",
    type_commision: input.commissions.join(",") || "NA",
    fourth_title: fourthTitle || null,
    codigo_senescyt_cuarto: fourthTitle ? input.codigo_senescyt_cuarto.trim() || null : null,
  };
}

export async function createMember(
  token: string,
  input: MemberWriteInput,
): Promise<{ member: Member; temporary_password: string; message: string }> {
  const response = await authorizedFetch(`${API_URL}/api/members`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify(toWritePayload(input)),
  });

  return parseResponse<{ member: Member; temporary_password: string; message: string }>(response);
}

export async function updateMember(
  token: string,
  memberId: number,
  input: MemberWriteInput,
): Promise<Member> {
  const response = await authorizedFetch(`${API_URL}/api/members/${memberId}`, {
    method: "PUT",
    headers: authHeaders(token, true),
    body: JSON.stringify(toWritePayload(input)),
  });

  return parseResponse<Member>(response);
}

export async function deleteMember(token: string, memberId: number): Promise<void> {
  const response = await authorizedFetch(`${API_URL}/api/members/${memberId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  await parseResponse<void>(response);
}

export async function disableMember(
  token: string,
  memberId: number,
): Promise<{ message: string; member: Member }> {
  const response = await authorizedFetch(`${API_URL}/api/members/${memberId}/disable`, {
    method: "POST",
    headers: authHeaders(token),
  });

  return parseResponse<{ message: string; member: Member }>(response);
}

export async function enableMember(
  token: string,
  memberId: number,
): Promise<{ message: string; member: Member }> {
  const response = await authorizedFetch(`${API_URL}/api/members/${memberId}/enable`, {
    method: "POST",
    headers: authHeaders(token),
  });

  return parseResponse<{ message: string; member: Member }>(response);
}

export async function resendMemberCredentials(
  token: string,
  memberId: number,
): Promise<{ message: string; temporary_password: string; member: Member }> {
  const response = await authorizedFetch(`${API_URL}/api/members/${memberId}/resend-credentials`, {
    method: "POST",
    headers: authHeaders(token),
  });

  return parseResponse<{ message: string; temporary_password: string; member: Member }>(
    response,
  );
}

async function downloadPdf(token: string, path: string, filename: string): Promise<void> {
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

export async function uploadMemberPhoto(
  token: string,
  memberId: number,
  file: File,
): Promise<Member> {
  const body = new FormData();
  body.append("photo", file);

  const response = await authorizedFetch(`${API_URL}/api/members/${memberId}/photo`, {
    method: "POST",
    headers: authHeaders(token),
    body,
  });

  return parseResponse<Member>(response);
}

export async function downloadMemberFile(token: string, memberId: number): Promise<void> {
  await downloadPdf(
    token,
    `/api/members/${memberId}/download`,
    `solicitud-afiliacion-${memberId}.pdf`,
  );
}

export async function downloadMemberCertificate(token: string, memberId: number): Promise<void> {
  await downloadPdf(
    token,
    `/api/members/${memberId}/certificate`,
    `certificado-afiliacion-${memberId}.pdf`,
  );
}

export type DebitAgreementKind = "authorization" | "identity";

export async function downloadMemberDebitDocument(
  token: string,
  memberId: number,
  kind: DebitAgreementKind,
): Promise<void> {
  const filename =
    kind === "authorization"
      ? `autorizacion-adv-${memberId}.pdf`
      : `cedula-acuerdo-${memberId}.pdf`;
  const response = await authorizedFetch(`${API_URL}/api/members/${memberId}/debit-agreement/${kind}`, {
    headers: authHeaders(token),
  });

  if (response.status === 404) {
    throw new Error("Este miembro aún no ha subido los documentos del acuerdo");
  }

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
