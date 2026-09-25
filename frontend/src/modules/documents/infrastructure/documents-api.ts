import { authorizedFetch } from "@/modules/auth/infrastructure/authorized-fetch";
import type { MemberDocument, MemberDocumentKey } from "@/modules/documents/domain/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiErrorBody {
  detail?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
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

export async function listMemberDocuments(token: string): Promise<MemberDocument[]> {
  const response = await authorizedFetch(`${API_URL}/api/member-documents`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<MemberDocument[]>(response);
}

export async function uploadMemberDocument(
  token: string,
  key: MemberDocumentKey,
  file: File,
): Promise<MemberDocument> {
  const payload = new FormData();
  payload.append("file", file);

  const response = await authorizedFetch(`${API_URL}/api/member-documents/${key}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: payload,
  });
  return parseResponse<MemberDocument>(response);
}

export async function uploadMemberDocumentCover(
  token: string,
  key: MemberDocumentKey,
  file: File,
): Promise<MemberDocument> {
  const payload = new FormData();
  payload.append("file", file);

  const response = await authorizedFetch(`${API_URL}/api/member-documents/${key}/cover`, {
    method: "PUT",
    headers: authHeaders(token),
    body: payload,
  });
  return parseResponse<MemberDocument>(response);
}

export async function updateMemberDocumentStyle(
  token: string,
  key: MemberDocumentKey,
  overlay_color: string,
  overlay_opacity: number,
): Promise<MemberDocument> {
  const response = await authorizedFetch(`${API_URL}/api/member-documents/${key}/style`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ overlay_color, overlay_opacity }),
  });
  return parseResponse<MemberDocument>(response);
}
