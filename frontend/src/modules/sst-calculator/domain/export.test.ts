import { describe, expect, it } from "vitest";

import { buildQuoteCsv, normalizeCiiuQuery, searchCiiu } from "./export";
import { createInitialQuote, type CiiuActivity } from "./types";

describe("CIIU search", () => {
  it("normalizes accents, case and surrounding spaces", () => {
    expect(normalizeCiiuQuery("  EXPLOTACIÓN Agrícola  ")).toBe("explotacion agricola");
  });

  it("searches code and description without accents or case", () => {
    const catalog: CiiuActivity[] = [
      { code: "A0111.11", description: "Cultivo de trigo", risk: "Bajo" },
      { code: "B0710.01", description: "Extracción de minerales", risk: "Alto" },
    ];
    expect(searchCiiu(catalog, "extraccion")).toEqual([catalog[1]]);
    expect(searchCiiu(catalog, "b0710")).toEqual([catalog[1]]);
  });

  it("shows 20 defaults and limits matching results to 35", () => {
    const catalog: CiiuActivity[] = Array.from({ length: 50 }, (_, index) => ({
      code: `A${index}`,
      description: `Actividad común ${index}`,
      risk: "Bajo",
    }));
    expect(searchCiiu(catalog, "")).toHaveLength(20);
    expect(searchCiiu(catalog, "actividad comun")).toHaveLength(35);
  });
});

describe("buildQuoteCsv", () => {
  it("emits UTF-8 BOM, semicolon rows, escaped quotes and the expected quote summary", () => {
    const input = {
      ...createInitialQuote(),
      company: "ACME \"Ecuador\"; S.A.",
      activity: { code: "A0111.11", description: "Cultivo de trigo", risk: "Bajo" as const },
      sbu: 460,
      centers: [{ name: "Matriz", place: "Quito", workers: 35, visits: 2 }],
      extraActivities: "Auditoría a contratistas\nInspección crítica",
    };
    const csv = buildQuoteCsv(input);

    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csv).toContain('"Concepto";"Valor"\r\n');
    expect(csv).toContain('"Empresa";"ACME ""Ecuador""; S.A."');
    expect(csv).toContain('"CIIU";"A0111.11"');
    expect(csv).toContain('"Implementación inicial (pago único)";"200"');
    expect(csv).toContain('"Incluido";"Auditoría a contratistas"');
    expect(csv).toContain('"Incluido";"Inspección crítica"');
    expect(csv.split("\r\n").every((row) => row.includes(";"))).toBe(true);
  });
});
