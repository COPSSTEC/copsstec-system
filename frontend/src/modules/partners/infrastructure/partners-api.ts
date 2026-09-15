import type { Partner } from "@/modules/partners/domain/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function listPublicPartners(): Promise<Partner[]> {
  const response = await fetch(`${API_URL}/api/partners`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("No fue posible cargar los aliados estratégicos.");
  }

  return response.json() as Promise<Partner[]>;
}
