import type { User } from "@/modules/auth/domain/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiErrorBody {
  detail?: string;
}

export interface PublicMember {
  profile_id: number;
  names: string;
  lastname: string;
  identifier: string;
  title: string;
  mobile_phone: string;
  email: string;
  province: string | null;
  state_label: string;
  is_active: boolean;
  foto_id: string;
  member_code: string;
}

export type ProfileSelfUpdate = {
  names?: string;
  lastname?: string;
  identifier?: string;
  email?: string;
  birtday?: string;
  blood_type?: string;
  mobile_phone?: string;
  fixed_phone?: string;
  title_academic?: string;
  level_academic?: string;
  cod_senescyt?: string;
  linkdink?: string;
  want_notifications?: boolean;
  is_work?: boolean;
  province?: string;
  city?: string;
  street_principal?: string;
  street_secondary?: string;
  fourth_title?: string;
  codigo_senescyt_cuarto?: string;
  gender?: string;
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  let message = "No fue posible completar la solicitud.";
  try {
    const body = (await response.json()) as ApiErrorBody;
    message = body.detail ?? message;
  } catch {
    message = response.statusText || message;
  }
  throw new Error(message);
}

async function downloadPdf(token: string, path: string, filename: string): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, {
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

export async function updateMyProfile(token: string, data: ProfileSelfUpdate): Promise<User> {
  const response = await fetch(`${API_URL}/api/profile/me`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return parseResponse<User>(response);
}

export async function updateMyPhoto(token: string, file: File): Promise<User> {
  const body = new FormData();
  body.append("photo", file);
  const response = await fetch(`${API_URL}/api/profile/me/photo`, {
    method: "POST",
    headers: authHeaders(token),
    body,
  });
  return parseResponse<User>(response);
}

export async function downloadMyCertificate(token: string): Promise<void> {
  await downloadPdf(token, "/api/profile/me/certificate", "certificado-afiliacion.pdf");
}

export async function downloadMyCarnet(token: string): Promise<void> {
  await downloadPdf(token, "/api/profile/me/carnet", "carnet-miembro.pdf");
}

export async function getPublicMember(profileId: number): Promise<PublicMember> {
  const response = await fetch(`${API_URL}/api/public/members/${profileId}`, {
    cache: "no-store",
  });
  return parseResponse<PublicMember>(response);
}

export function publicMemberQrUrl(profileId: number): string {
  return `${API_URL}/api/public/members/${profileId}/qr`;
}
