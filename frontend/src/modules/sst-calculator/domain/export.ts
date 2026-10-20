import { calculateNormativeRequirement, calculateQuote } from "./calculations";
import type { CiiuActivity, SstQuoteInput } from "./types";

export function normalizeCiiuQuery(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

export function searchCiiu(catalog: CiiuActivity[], query: string): CiiuActivity[] {
  const normalized = normalizeCiiuQuery(query);
  return (normalized ? catalog.filter((item) => normalizeCiiuQuery(`${item.code} ${item.description}`).includes(normalized)) : catalog.slice(0, 20)).slice(0, 35);
}

function csvCell(value: unknown): string { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export function buildQuoteCsv(input: SstQuoteInput): string {
  const quote = calculateQuote(input);
  const normative = calculateNormativeRequirement(input.workers, input.activity?.risk ?? "");
  const rows: unknown[][] = [
    ["Concepto", "Valor"], ["Empresa", input.company], ["CIIU", input.activity?.code], ["Riesgo", normative.risk],
    ["Trabajadores", normative.workers], ["Centros", input.centerCount],
    ...input.centers.flatMap((center, index) => [[`Centro ${index + 1}`, center.name], [`Ubicación centro ${index + 1}`, center.place], [`Trabajadores centro ${index + 1}`, center.workers], [`Visitas mensuales centro ${index + 1}`, center.visits]]),
    ["Personal", normative.count], ["Dedicación", normative.description], ["Meses", quote.months],
    ["Costo mes 1", quote.firstMonthCost], ["Tarifa negociada", quote.negotiatedPrice], ["Margen primer año (%)", quote.firstYearMargin],
    ["Implementación inicial (pago único)", quote.setupPrice], ["Ingreso contrato", quote.totalIncome], ["Costo contrato", quote.totalCost], ["Utilidad contrato", quote.profit], ["Margen total (%)", quote.totalMargin],
    ...input.scope.map((scope) => ["Incluido", scope]), ...input.extraActivities.split("\n").map((item) => item.trim()).filter(Boolean).map((item) => ["Incluido", item]),
  ];
  return `\ufeff${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}

export function downloadQuoteCsv(input: SstQuoteInput): void {
  const url = URL.createObjectURL(new Blob([buildQuoteCsv(input)], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "Cotizacion_COPSSTEC_SST.csv"; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
