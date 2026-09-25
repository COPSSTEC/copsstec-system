import { authorizedFetch } from "@/modules/auth/infrastructure/authorized-fetch";
import type {
  AdminDashboardSnapshot,
  DashboardExportKey,
  MemberDashboardSnapshot,
} from "@/modules/dashboard/domain/types";

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

function filenameFromDisposition(
  header: string | null,
  key: DashboardExportKey,
  year?: number,
): string {
  if (header) {
    const utf = header.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf?.[1]) {
      try {
        return decodeURIComponent(utf[1].trim());
      } catch {
        return utf[1].trim();
      }
    }
    const quoted = header.match(/filename="([^"]+)"/i);
    if (quoted?.[1]) {
      return quoted[1];
    }
    const plain = header.match(/filename=([^;]+)/i);
    if (plain?.[1]) {
      return plain[1].trim().replace(/^["']|["']$/g, "");
    }
  }

  const suffix = key === "income" && year ? `-${year}` : "";
  return `dashboard-${key}${suffix}.csv`;
}

export async function getMemberDashboard(token: string): Promise<MemberDashboardSnapshot> {
  const response = await authorizedFetch(`${API_URL}/api/dashboard/member`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<MemberDashboardSnapshot>(response);
}

export async function getAdminDashboard(
  token: string,
  year: number,
): Promise<AdminDashboardSnapshot> {
  const params = new URLSearchParams();
  params.set("year", String(year));

  const response = await authorizedFetch(`${API_URL}/api/dashboard/admin?${params.toString()}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });

  return parseResponse<AdminDashboardSnapshot>(response);
}

export async function downloadDashboardExport(
  token: string,
  key: DashboardExportKey,
  year?: number,
): Promise<void> {
  const params = new URLSearchParams();
  if (year !== undefined) {
    params.set("year", String(year));
  }

  const query = params.toString();
  const response = await authorizedFetch(
    `${API_URL}/api/dashboard/admin/exports/${key}${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    await parseResponse<void>(response);
    return;
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filenameFromDisposition(response.headers.get("Content-Disposition"), key, year);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}
