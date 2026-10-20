import { describe, expect, it } from "vitest";

import {
  calculateLaborCost,
  calculateMobility,
  calculateNormativeRequirement,
  calculateQuote,
  calculateSuggestedVisits,
  distributeVisits,
  resolveProtegePlan,
  validateCenters,
} from "./calculations";
import { createInitialQuote, type RiskLevel, type SstQuoteInput } from "./types";

function quote(overrides: Partial<SstQuoteInput> = {}): SstQuoteInput {
  return {
    ...createInitialQuote(),
    activity: { code: "A0111.11", description: "Cultivo de trigo", risk: "Bajo" },
    sbu: 460,
    centers: [{ name: "Matriz", place: "Quito", workers: 35, visits: 2 }],
    ...overrides,
  };
}

describe("calculateNormativeRequirement", () => {
  const cases: Array<{
    workers: number;
    expected: Record<RiskLevel, { hours: number | null; count: number; monitor: boolean }>;
  }> = [
    { workers: 1, expected: { Bajo: { hours: 8, count: 1, monitor: true }, Medio: { hours: 8, count: 1, monitor: true }, Alto: { hours: 16, count: 1, monitor: false } } },
    { workers: 9, expected: { Bajo: { hours: 8, count: 1, monitor: true }, Medio: { hours: 8, count: 1, monitor: true }, Alto: { hours: 16, count: 1, monitor: false } } },
    { workers: 10, expected: { Bajo: { hours: 16, count: 1, monitor: true }, Medio: { hours: 32, count: 1, monitor: true }, Alto: { hours: 48, count: 1, monitor: false } } },
    { workers: 49, expected: { Bajo: { hours: 16, count: 1, monitor: true }, Medio: { hours: 32, count: 1, monitor: true }, Alto: { hours: 48, count: 1, monitor: false } } },
    { workers: 50, expected: { Bajo: { hours: 32, count: 1, monitor: false }, Medio: { hours: 48, count: 1, monitor: false }, Alto: { hours: 64, count: 1, monitor: false } } },
    { workers: 99, expected: { Bajo: { hours: 32, count: 1, monitor: false }, Medio: { hours: 48, count: 1, monitor: false }, Alto: { hours: 64, count: 1, monitor: false } } },
    { workers: 100, expected: { Bajo: { hours: null, count: 1, monitor: false }, Medio: { hours: null, count: 1, monitor: false }, Alto: { hours: null, count: 1, monitor: false } } },
    { workers: 199, expected: { Bajo: { hours: null, count: 1, monitor: false }, Medio: { hours: null, count: 1, monitor: false }, Alto: { hours: null, count: 1, monitor: false } } },
    { workers: 200, expected: { Bajo: { hours: null, count: 2, monitor: false }, Medio: { hours: null, count: 2, monitor: false }, Alto: { hours: null, count: 3, monitor: false } } },
  ];

  for (const { workers, expected } of cases) {
    for (const risk of ["Bajo", "Medio", "Alto"] as const) {
      it(`covers ${workers} workers at ${risk} risk`, () => {
        const result = calculateNormativeRequirement(workers, risk);
        expect(result).toMatchObject({
          hours: expected[risk].hours,
          count: expected[risk].count,
          monitorRequired: expected[risk].monitor,
          role: expected[risk].monitor ? "Monitor" : "Técnico",
        });
      });
    }
  }

  it("uses the high-risk divisor after 200 workers", () => {
    expect(calculateNormativeRequirement(400, "Bajo").count).toBe(3);
    expect(calculateNormativeRequirement(400, "Medio").count).toBe(3);
    expect(calculateNormativeRequirement(400, "Alto").count).toBe(5);
  });
});

describe("visits, work centers and mobility", () => {
  it("enforces one suggested visit per eight hours below 100 workers", () => {
    expect(calculateSuggestedVisits({ workers: 35, serviceHours: 0 })).toBe(1);
    expect(calculateSuggestedVisits({ workers: 35, serviceHours: 8 })).toBe(1);
    expect(calculateSuggestedVisits({ workers: 35, serviceHours: 9 })).toBe(2);
    expect(calculateSuggestedVisits({ workers: 99, serviceHours: 64 })).toBe(8);
  });

  it("disables suggested visits for permanent services", () => {
    expect(calculateSuggestedVisits({ workers: 100, serviceHours: 160 })).toBe(0);
    expect(calculateSuggestedVisits({ workers: 400, serviceHours: 160 })).toBe(0);
  });

  it("distributes every visit while preserving the total", () => {
    const distribution = distributeVisits(8, 3);
    expect(distribution).toEqual([3, 3, 2]);
    expect(distribution.reduce((sum, visits) => sum + visits, 0)).toBe(8);
    expect(distributeVisits(4, 0)).toEqual([]);
  });

  it("validates count, required text, integer workers and exact worker sum", () => {
    const centers = [
      { name: "Matriz", place: "Quito", workers: 20, visits: 1 },
      { name: "Sucursal", place: "Cuenca", workers: 15, visits: 1 },
    ];
    expect(validateCenters(centers, 2, 35)).toBe(true);
    expect(validateCenters(centers, 1, 35)).toBe(false);
    expect(validateCenters(centers, 2, 36)).toBe(false);
    expect(validateCenters([{ ...centers[0], workers: 20.5 }, centers[1]], 2, 35.5)).toBe(false);
    expect(validateCenters([{ ...centers[0], name: " " }, centers[1]], 2, 35)).toBe(false);
  });

  it("uses visits for hourly service and half a base trip per center for permanent service", () => {
    expect(calculateMobility(quote({ workers: 35, visits: 3, visitCost: 30 }))).toBe(90);
    expect(calculateMobility(quote({ workers: 100, centerCount: 3, visitCost: 30 }))).toBe(45);
  });
});

describe("calculateLaborCost", () => {
  it("prorates the full monthly payroll by assigned hours", () => {
    const result = calculateLaborCost(quote({ workers: 35, serviceHours: 16, capacity: 160 }), 1);
    expect(result.ratio).toBe(0.1);
    expect(result.full.salary).toBe(900);
    expect(result.salary).toBe(90);
    expect(result.fourteen).toBeCloseTo((460 / 12) * 0.1);
    expect(result.total).toBeCloseTo(result.full.total * 0.1);
  });

  it("budgets one senior and the remaining technicians as junior at full allocation", () => {
    const result = calculateLaborCost(quote({
      workers: 400,
      activity: { code: "X", description: "Riesgo alto", risk: "Alto" },
      juniorSalary: 900,
      seniorSalary: 1200,
      capacity: 160,
    }), 1);
    expect(result.ratio).toBe(1);
    expect(result.full.salary).toBe(1200 + 4 * 900);
    expect(result.full.fourteen).toBeCloseTo((460 / 12) * 5);
  });

  it("activates reserve only after twelve months of combined seniority", () => {
    const input = quote({ seniority: 0, reserveRate: 8.333333 });
    expect(calculateLaborCost(input, 12).full.reserve).toBe(0);
    expect(calculateLaborCost(input, 13).full.reserve).toBeCloseTo(900 * 8.333333 / 100);
    expect(calculateLaborCost(quote({ seniority: 12 }), 1).full.reserve).toBeCloseTo(900 * 8.333333 / 100);
  });
});

describe("resolveProtegePlan", () => {
  it.each([
    [1, 100, 200], [49, 100, 200], [50, 200, 400], [99, 200, 400],
    [100, 250, 500], [199, 250, 500], [200, 300, 600], [499, 300, 600],
    [500, 500, 1000], [699, 500, 1000], [700, 800, 1600], [999, 800, 1600],
    [1000, 1000, 2000], [4000, 2500, 2000],
  ])("resolves %i workers to monthly %i and setup %i", (workers, fee, setup) => {
    expect(resolveProtegePlan(workers)).toMatchObject({ fee, setup });
  });

  it("requires a custom quote above 4000 workers", () => {
    expect(resolveProtegePlan(4001)).toEqual({ fee: null, setup: null, name: "Cotización personalizada" });
    expect(resolveProtegePlan(0)).toBeNull();
  });
});

describe("calculateQuote", () => {
  it("keeps PROTEGE setup as a one-time matching income and cost", () => {
    const input = quote({ term: 12, protegeSetup: 200, targetMargin: 30, discount: 0 });
    const result = calculateQuote(input);
    expect(result.setupPrice).toBe(200);
    expect(result.totalIncome).toBeCloseTo(result.negotiatedPrice * 12 + 200);
    expect(result.totalCost).toBeCloseTo(result.monthlyCosts.reduce((sum, cost) => sum + cost, 0) + 200);
    expect(result.profit).toBeCloseTo(result.totalIncome - result.totalCost);
  });

  it("removes both PROTEGE costs when the plan is disabled", () => {
    const withProtege = calculateQuote(quote({ useProtege: true, protegeMonthly: 100, protegeSetup: 200 }));
    const withoutProtege = calculateQuote(quote({ useProtege: false, protegeMonthly: 100, protegeSetup: 200 }));
    expect(withoutProtege.setupPrice).toBe(0);
    expect(withProtege.firstMonthCost - withoutProtege.firstMonthCost).toBeCloseTo(100);
  });

  it("applies second-year growth from month 13 in a 24-month contract", () => {
    const result = calculateQuote(quote({ term: 24, seniority: 24, secondYearIncrease: 10 }));
    expect(result.monthlyCosts).toHaveLength(24);
    expect(result.monthlyCosts[12]).toBeCloseTo(result.monthlyCosts[11] * 1.1);
  });

  it("reports reference, negotiated, actual and total margins plus maximum discount", () => {
    const result = calculateQuote(quote({ targetMargin: 30, discount: 10, minimumMargin: 20 }));
    expect(result.referencePrice).toBeCloseTo(result.firstMonthCost / 0.7);
    expect(result.negotiatedPrice).toBeCloseTo(result.referencePrice * 0.9);
    expect(result.firstYearMargin).toBeCloseTo((result.negotiatedPrice - result.firstMonthCost) / result.negotiatedPrice * 100);
    expect(result.totalMargin).toBeCloseTo(result.profit / result.totalIncome * 100);
    expect(result.maxDiscount).toBeCloseTo(12.5);
    expect(result.viable).toBe(true);
  });

  it("flags a negotiated quote below the minimum margin", () => {
    const result = calculateQuote(quote({ targetMargin: 30, discount: 25, minimumMargin: 20 }));
    expect(result.firstYearMargin).toBeLessThan(20);
    expect(result.viable).toBe(false);
  });
});
