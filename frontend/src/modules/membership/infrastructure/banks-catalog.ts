import { parseBanksCsv, type BankInstitution } from "@/modules/membership/domain/banks";

let cached: Promise<BankInstitution[]> | null = null;

export function loadBanksCatalog(): Promise<BankInstitution[]> {
  if (!cached) {
    cached = fetch("/data/ecuador-banks.csv", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudo cargar el catálogo de bancos.");
        }
        return parseBanksCsv(await response.text());
      })
      .catch(() => []);
  }
  return cached;
}
