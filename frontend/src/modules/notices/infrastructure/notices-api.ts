import { authorizedFetch } from "@/modules/auth/infrastructure/authorized-fetch";
import type { AdminNotice } from "@/modules/notices/domain/types";

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

export async function listAdminNotices(token: string): Promise<AdminNotice[]> {
  const response = await authorizedFetch(`${API_URL}/api/notices/admin`, {
    headers: authHeaders(token),
  });
  return parseResponse<AdminNotice[]>(response);
}

export async function createNotice(token: string, input: FormData): Promise<AdminNotice> {
  const response = await authorizedFetch(`${API_URL}/api/notices/admin`, {
    method: "POST",
    headers: authHeaders(token),
    body: input,
  });
  return parseResponse<AdminNotice>(response);
}

export async function updateNotice(
  token: string,
  noticeId: number,
  input: FormData,
): Promise<AdminNotice> {
  const response = await authorizedFetch(`${API_URL}/api/notices/admin/${noticeId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: input,
  });
  return parseResponse<AdminNotice>(response);
}

export async function setNoticeVisibility(
  token: string,
  noticeId: number,
  stateId: number,
): Promise<AdminNotice> {
  const response = await authorizedFetch(`${API_URL}/api/notices/admin/${noticeId}/visibility`, {
    method: "PATCH",
    headers: authHeaders(token, true),
    body: JSON.stringify({ state_id: stateId }),
  });
  return parseResponse<AdminNotice>(response);
}

export async function deleteNotice(token: string, noticeId: number): Promise<void> {
  const response = await authorizedFetch(`${API_URL}/api/notices/admin/${noticeId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  await parseResponse<void>(response);
}
