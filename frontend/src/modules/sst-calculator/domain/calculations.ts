import type { LaborCost, LaborCostDetail, NormativeResult, ProtegePlan, QuoteResult, RiskLevel, SstQuoteInput, WorkCenter } from "./types";

export function calculateNormativeRequirement(workers: number, risk: RiskLevel | ""): NormativeResult {
  const n = Math.max(0, workers);
  const monitorRequired = n < 50 && risk !== "Alto";
  let hours: number | null = 0;
  let count = 1;
  if (n < 10) hours = risk === "Alto" ? 16 : 8;
  else if (n < 50) hours = risk === "Alto" ? 48 : risk === "Medio" ? 32 : 16;
  else if (n < 100) hours = risk === "Alto" ? 64 : risk === "Medio" ? 48 : 32;
  else if (n < 200) hours = null;
  else { hours = null; count = 1 + Math.floor(n / (risk === "Alto" ? 100 : 200)); }
  return { workers: n, risk, monitorRequired, hours, count, role: monitorRequired ? "Monitor" : "Técnico", description: hours === null ? "8 horas diarias por técnico permanente" : `${hours} horas/mes` };
}

export function assignedHours(input: SstQuoteInput, normative = calculateNormativeRequirement(input.workers, input.activity?.risk ?? "")): number {
  return normative.hours === null ? Math.max(1, input.capacity) : Math.max(1, input.serviceHours);
}

export function calculateSuggestedVisits(input: Pick<SstQuoteInput, "workers" | "serviceHours">): number {
  return input.workers >= 100 ? 0 : Math.max(1, Math.ceil(Math.max(0, input.serviceHours) / 8));
}

export function distributeVisits(total: number, count: number): number[] {
  if (count < 1) return [];
  return Array.from({ length: count }, (_, index) => Math.floor(total / count) + (index < total % count ? 1 : 0));
}

export function validateCenters(centers: WorkCenter[], expectedCount: number, workers: number): boolean {
  return centers.length === expectedCount && centers.reduce((sum, center) => sum + center.workers, 0) === workers && centers.every((center) => Number.isInteger(center.workers) && center.workers >= 0 && center.name.trim() !== "" && center.place.trim() !== "");
}

export function calculateLaborCost(input: SstQuoteInput, month: number): LaborCost {
  const normative = calculateNormativeRequirement(input.workers, input.activity?.risk ?? "");
  const permanent = normative.hours === null;
  const capacity = Math.max(1, input.capacity);
  const ratio = permanent ? 1 : Math.min(1, assignedHours(input, normative) / capacity);
  const fullSalary = normative.count > 1 ? input.seniorSalary + (normative.count - 1) * input.juniorSalary : input.juniorSalary;
  const reserveActive = input.seniority + month > 12;
  const full: LaborCostDetail = {
    salary: fullSalary,
    patron: fullSalary * input.employerContribution / 100,
    thirteen: fullSalary / 12,
    fourteen: input.sbu / 12 * normative.count,
    vacation: fullSalary * input.vacationRate / 100,
    reserve: reserveActive ? fullSalary * input.reserveRate / 100 : 0,
    total: 0,
  };
  full.total = full.salary + full.patron + full.thirteen + full.fourteen + full.vacation + full.reserve;
  return { salary: full.salary * ratio, patron: full.patron * ratio, thirteen: full.thirteen * ratio, fourteen: full.fourteen * ratio, vacation: full.vacation * ratio, reserve: full.reserve * ratio, total: full.total * ratio, ratio, full };
}

export function calculateMobility(input: SstQuoteInput): number {
  const permanent = input.workers >= 100;
  return (permanent ? Math.max(1, input.centerCount) : input.visits) * input.visitCost * (permanent ? 0.5 : 1);
}

export function resolveProtegePlan(workers: number): ProtegePlan | null {
  if (workers > 4000) return { fee: null, setup: null, name: "Cotización personalizada" };
  const plans = [
    { min: 1, max: 49, fee: 100, setup: 200, name: "Hasta 49 trabajadores" },
    { min: 50, max: 99, fee: 200, setup: 400, name: "Mediana A" },
    { min: 100, max: 199, fee: 250, setup: 500, name: "Mediana B" },
    { min: 200, max: 499, fee: 300, setup: 600, name: "Gran empresa I" },
    { min: 500, max: 699, fee: 500, setup: 1000, name: "Gran empresa II" },
    { min: 700, max: 999, fee: 800, setup: 1600, name: "Gran empresa III" },
    { min: 1000, max: 4000, fee: 0, setup: 2000, name: "Gran empresa IV" },
  ];
  const plan = plans.find((candidate) => workers >= candidate.min && workers <= candidate.max);
  return plan ? { fee: plan.min === 1000 ? 1000 + (workers - 1000) * 0.5 : plan.fee, setup: plan.setup, name: plan.name } : null;
}

export function calculateQuote(input: SstQuoteInput): QuoteResult {
  const months = input.term;
  const setupPrice = input.useProtege ? input.protegeSetup : 0;
  const monthlyCosts = Array.from({ length: months }, (_, index) => {
    const labor = calculateLaborCost(input, index + 1);
    const growth = index >= 12 ? 1 + input.secondYearIncrease / 100 : 1;
    const operations = calculateMobility(input) + (input.useProtege ? input.protegeMonthly : 0) + input.otherCosts + input.coordination + labor.total * input.adminRate / 100;
    return (labor.total + operations) * growth;
  });
  const firstMonthCost = monthlyCosts[0] ?? 0;
  const margin = Math.min(89.99, input.targetMargin) / 100;
  const referencePrice = firstMonthCost / (1 - margin);
  const negotiatedPrice = referencePrice * (1 - input.discount / 100);
  const firstYearMargin = negotiatedPrice ? 100 * (negotiatedPrice - firstMonthCost) / negotiatedPrice : -100;
  const monthlyIncome = negotiatedPrice * months;
  const totalIncome = monthlyIncome + setupPrice;
  const totalCost = monthlyCosts.reduce((sum, cost) => sum + cost, 0) + setupPrice;
  const profit = totalIncome - totalCost;
  const totalMargin = totalIncome ? 100 * profit / totalIncome : 0;
  const maxDiscount = referencePrice ? Math.max(0, 100 * (1 - (firstMonthCost / (1 - input.minimumMargin / 100)) / referencePrice)) : 0;
  return { firstMonthCost, referencePrice, negotiatedPrice, firstYearMargin, totalCost, totalIncome, monthlyIncome, profit, totalMargin, maxDiscount, months, monthlyCosts, setupPrice, viable: firstYearMargin >= input.minimumMargin && totalMargin >= input.minimumMargin };
}
