import type {
  Election,
  ElectionList,
  ElectionReport,
  MemberPortal,
  VoterListResult,
} from "@/modules/votaciones/domain/types";

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
    const body = (await response.json()) as ApiErrorBody | { detail?: unknown };
    if (typeof body.detail === "string") {
      message = body.detail;
    } else if (Array.isArray(body.detail)) {
      message = body.detail
        .map((item) => (typeof item === "object" && item && "msg" in item ? String(item.msg) : String(item)))
        .join(" ");
    }
  } catch {
    message = response.statusText || message;
  }
  throw new Error(message);
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function withElection(path: string, electionId?: number): string {
  if (!electionId) {
    return `${API_URL}${path}`;
  }
  const join = path.includes("?") ? "&" : "?";
  return `${API_URL}${path}${join}election_id=${electionId}`;
}

async function downloadFile(token: string, path: string, electionId?: number): Promise<void> {
  const response = await fetch(withElection(path, electionId), { headers: authHeaders(token) });
  if (!response.ok) {
    await parseResponse(response);
    return;
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  link.href = url;
  link.download = match?.[1] ?? "archivo";
  link.click();
  URL.revokeObjectURL(url);
}

export async function getAdminElection(token: string, electionId?: number): Promise<Election> {
  const response = await fetch(withElection("/api/votaciones/admin/election", electionId), {
    headers: authHeaders(token),
  });
  return parseResponse<Election>(response);
}

export async function updateAdminElection(
  token: string,
  payload: Partial<Election>,
  electionId?: number,
): Promise<Election> {
  const response = await fetch(withElection("/api/votaciones/admin/election", electionId), {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Election>(response);
}

export async function closeElection(token: string, electionId?: number): Promise<Election> {
  const response = await fetch(withElection("/api/votaciones/admin/election/close", electionId), {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<Election>(response);
}

export async function startElection(token: string): Promise<Election> {
  const response = await fetch(`${API_URL}/api/votaciones/admin/election/start`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<Election>(response);
}

export async function uploadElectionMedia(
  token: string,
  kind: "logo" | "banner",
  file: File,
  electionId?: number,
): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(withElection(`/api/votaciones/admin/election/media?kind=${kind}`, electionId), {
    method: "POST",
    headers: authHeaders(token),
    body,
  });
  const data = await parseResponse<{ url: string }>(response);
  return data.url;
}

export async function createPosition(token: string, name: string, electionId?: number) {
  const response = await fetch(withElection("/api/votaciones/admin/positions", electionId), {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseResponse(response);
}

export async function updatePosition(
  token: string,
  positionId: number,
  payload: Record<string, unknown>,
  electionId?: number,
) {
  const response = await fetch(withElection(`/api/votaciones/admin/positions/${positionId}`, electionId), {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function deletePosition(token: string, positionId: number, electionId?: number) {
  const response = await fetch(withElection(`/api/votaciones/admin/positions/${positionId}`, electionId), {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return parseResponse(response);
}

export async function saveCalendar(
  token: string,
  events: Array<{ event_key: string; title: string; starts_on: string | null; ends_on: string | null }>,
  electionId?: number,
): Promise<Election> {
  const response = await fetch(withElection("/api/votaciones/admin/calendar", electionId), {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });
  return parseResponse<Election>(response);
}

export async function publishCalendar(token: string, isPublic: boolean, electionId?: number): Promise<Election> {
  const response = await fetch(withElection("/api/votaciones/admin/calendar/publish", electionId), {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ public: isPublic }),
  });
  return parseResponse<Election>(response);
}

export async function downloadCalendar(token: string, electionId?: number): Promise<void> {
  await downloadFile(token, "/api/votaciones/admin/calendar/download", electionId);
}

export async function listAdminLists(token: string, electionId?: number): Promise<ElectionList[]> {
  const response = await fetch(withElection("/api/votaciones/admin/lists", electionId), {
    headers: authHeaders(token),
  });
  return parseResponse<ElectionList[]>(response);
}

export async function createList(token: string, payload: Partial<ElectionList>, electionId?: number) {
  const response = await fetch(withElection("/api/votaciones/admin/lists", electionId), {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ElectionList>(response);
}

export async function getAdminList(token: string, listId: number): Promise<ElectionList> {
  const response = await fetch(`${API_URL}/api/votaciones/admin/lists/${listId}`, {
    headers: authHeaders(token),
  });
  return parseResponse<ElectionList>(response);
}

export async function updateList(
  token: string,
  listId: number,
  payload: Partial<ElectionList>,
  electionId?: number,
): Promise<ElectionList> {
  const response = await fetch(withElection(`/api/votaciones/admin/lists/${listId}`, electionId), {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ElectionList>(response);
}

export async function deleteList(token: string, listId: number, electionId?: number) {
  const response = await fetch(withElection(`/api/votaciones/admin/lists/${listId}`, electionId), {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return parseResponse(response);
}

export async function uploadListFile(
  token: string,
  listId: number,
  kind: "logo" | "work-plan" | "backing-document",
  file: File,
  electionId?: number,
): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(withElection(`/api/votaciones/admin/lists/${listId}/${kind}`, electionId), {
    method: "POST",
    headers: authHeaders(token),
    body,
  });
  const data = await parseResponse<{ url: string }>(response);
  return data.url;
}

export async function saveCandidate(
  token: string,
  listId: number,
  payload: {
    position_id: number;
    full_name: string;
    profession: string;
    short_profile: string;
    sort_order?: number;
  },
  candidateId?: number,
  electionId?: number,
): Promise<ElectionList> {
  const path = candidateId
    ? `/api/votaciones/admin/lists/${listId}/candidates/${candidateId}`
    : `/api/votaciones/admin/lists/${listId}/candidates`;
  const response = await fetch(withElection(path, electionId), {
    method: candidateId ? "PUT" : "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ElectionList>(response);
}

export async function deleteCandidate(token: string, listId: number, candidateId: number, electionId?: number) {
  const response = await fetch(
    withElection(`/api/votaciones/admin/lists/${listId}/candidates/${candidateId}`, electionId),
    { method: "DELETE", headers: authHeaders(token) },
  );
  return parseResponse(response);
}

export async function uploadCandidatePhoto(
  token: string,
  listId: number,
  candidateId: number,
  file: File,
  electionId?: number,
): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(
    withElection(`/api/votaciones/admin/lists/${listId}/candidates/${candidateId}/photo`, electionId),
    { method: "POST", headers: authHeaders(token), body },
  );
  const data = await parseResponse<{ url: string }>(response);
  return data.url;
}

export async function listVoters(
  token: string,
  query: { q?: string; payment_status?: string; enabled?: boolean; page?: number; page_size?: number },
  electionId?: number,
): Promise<VoterListResult> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.payment_status) params.set("payment_status", query.payment_status);
  if (query.enabled !== undefined) params.set("enabled", String(query.enabled));
  params.set("page", String(query.page ?? 1));
  params.set("page_size", String(query.page_size ?? 8));
  const response = await fetch(withElection(`/api/votaciones/admin/voters?${params}`, electionId), {
    headers: authHeaders(token),
  });
  return parseResponse<VoterListResult>(response);
}

export async function toggleVoter(token: string, userId: number, enabled: boolean, electionId?: number) {
  const response = await fetch(withElection(`/api/votaciones/admin/voters/${userId}`, electionId), {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ voting_enabled: enabled }),
  });
  return parseResponse<VoterListResult>(response);
}

export async function syncVoters(token: string, electionId?: number) {
  const response = await fetch(withElection("/api/votaciones/admin/voters/sync", electionId), {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<VoterListResult>(response);
}

export async function exportVoters(token: string, electionId?: number) {
  await downloadFile(token, "/api/votaciones/admin/voters/export", electionId);
}

export async function saveMessages(token: string, templates: Election["templates"], electionId?: number) {
  const response = await fetch(withElection("/api/votaciones/admin/messages", electionId), {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ templates }),
  });
  return parseResponse<Election>(response);
}

export async function testMessage(token: string, templateKey: string, email: string, electionId?: number) {
  const response = await fetch(withElection("/api/votaciones/admin/messages/test", electionId), {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ template_key: templateKey, email }),
  });
  return parseResponse(response);
}

export async function sendMessage(token: string, templateKey: string, electionId?: number) {
  const response = await fetch(withElection("/api/votaciones/admin/messages/send", electionId), {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ template_key: templateKey }),
  });
  return parseResponse(response);
}

export async function getReports(token: string, electionId?: number): Promise<ElectionReport> {
  const response = await fetch(withElection("/api/votaciones/admin/reports", electionId), {
    headers: authHeaders(token),
  });
  return parseResponse<ElectionReport>(response);
}

export async function exportReport(token: string, format: "pdf" | "xlsx", electionId?: number) {
  await downloadFile(token, `/api/votaciones/admin/reports/export?format=${format}`, electionId);
}

export async function downloadActa(token: string, electionId?: number) {
  await downloadFile(token, "/api/votaciones/admin/reports/acta", electionId);
}

export async function getMemberPortal(token: string): Promise<MemberPortal> {
  const response = await fetch(`${API_URL}/api/votaciones/me`, { headers: authHeaders(token) });
  return parseResponse<MemberPortal>(response);
}

export async function getMemberList(token: string, listId: number): Promise<MemberPortal> {
  const response = await fetch(`${API_URL}/api/votaciones/me/lists/${listId}`, {
    headers: authHeaders(token),
  });
  return parseResponse<MemberPortal>(response);
}

export async function castVote(
  token: string,
  payload: { list_id?: number | null; is_blank?: boolean; choices?: Array<{ position_id: number; list_id?: number; is_blank?: boolean }> },
) {
  const response = await fetch(`${API_URL}/api/votaciones/me/vote`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function getPublicCalendar(): Promise<{ public: boolean; election: Election | null }> {
  const response = await fetch(`${API_URL}/api/votaciones/public/calendar`);
  return parseResponse(response);
}

export function publicCalendarDownloadUrl(): string {
  return `${API_URL}/api/votaciones/public/calendar/download`;
}
