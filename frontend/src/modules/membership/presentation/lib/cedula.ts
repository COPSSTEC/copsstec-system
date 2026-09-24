export const CEDULA_INVALID_MESSAGE = "La cédula debe tener exactamente 10 dígitos.";

export function normalizeCedula(value: string): string {
  return (value || "").replace(/\D/g, "").slice(0, 10);
}

export function isValidEcuadorianCedula(value: string): boolean {
  const raw = (value || "").trim();
  return /^\d{10}$/.test(raw);
}
