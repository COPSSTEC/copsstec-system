import { authorizedFetch } from "@/modules/auth/infrastructure/authorized-fetch";
import type { CiiuActivity, SstCalculatorAccessResponse } from "../domain/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class SstCalculatorApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "SstCalculatorApiError";
  }
}

async function apiError(response: Response, fallback: string): Promise<SstCalculatorApiError> {
  try {
    const body = await response.json() as { detail?: string };
    return new SstCalculatorApiError(body.detail ?? fallback, response.status);
  } catch {
    return new SstCalculatorApiError(fallback, response.status);
  }
}

export async function getSstCalculatorAccess(): Promise<SstCalculatorAccessResponse> {
  const response = await authorizedFetch(`${API_URL}/api/sst-calculator/access`, { cache: "no-store" });
  if (!response.ok) throw await apiError(response, "No se pudo validar el acceso a Cotiza SST.");
  return response.json() as Promise<SstCalculatorAccessResponse>;
}

export async function getCiiuCatalog(): Promise<CiiuActivity[]> {
  const response = await authorizedFetch(`${API_URL}/api/sst-calculator/catalog`, { cache: "no-store" });
  if (!response.ok) throw await apiError(response, response.status === 403 ? "Ya no tienes acceso a Cotiza SST. Verifica tu estado de membresía y pagos." : "No se pudo cargar el catálogo CIIU.");
  return response.json() as Promise<CiiuActivity[]>;
}
