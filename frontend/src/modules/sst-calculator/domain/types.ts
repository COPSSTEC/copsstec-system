export type RiskLevel = "Bajo" | "Medio" | "Alto";

export interface SstCalculatorAccessResponse {
  allowed: boolean;
  balance_status: "al_dia" | "saldo_pendiente";
  pending_balance: string;
  reason: string | null;
}

export interface CiiuActivity {
  code: string;
  description: string;
  risk: RiskLevel;
}

export interface WorkCenter {
  name: string;
  place: string;
  workers: number;
  visits: number;
}

export interface SstQuoteInput {
  company: string;
  ruc: string;
  contact: string;
  location: string;
  activity: CiiuActivity | null;
  workers: number;
  centerCount: number;
  centers: WorkCenter[];
  serviceMode: "external" | "advice";
  serviceHours: number;
  capacity: number;
  juniorSalary: number;
  seniorSalary: number;
  seniority: number;
  employerContribution: number;
  reserveRate: number;
  sbu: number;
  vacationRate: number;
  visits: number;
  visitCost: number;
  useProtege: boolean;
  protegeMonthly: number;
  protegeSetup: number;
  otherCosts: number;
  adminRate: number;
  coordination: number;
  scope: string[];
  extraActivities: string;
  term: 12 | 24;
  targetMargin: number;
  discount: number;
  minimumMargin: number;
  secondYearIncrease: number;
  issuerBusiness: string;
  issuerRuc: string;
  signer: string;
  signerRole: string;
  validity: number;
  remarks: string;
}

export interface NormativeResult {
  workers: number;
  risk: RiskLevel | "";
  monitorRequired: boolean;
  hours: number | null;
  count: number;
  role: "Monitor" | "Técnico";
  description: string;
}

export interface LaborCostDetail {
  salary: number;
  patron: number;
  thirteen: number;
  fourteen: number;
  vacation: number;
  reserve: number;
  total: number;
}

export interface LaborCost extends LaborCostDetail {
  ratio: number;
  full: LaborCostDetail;
}

export interface ProtegePlan {
  fee: number | null;
  setup: number | null;
  name: string;
}

export interface QuoteResult {
  firstMonthCost: number;
  referencePrice: number;
  negotiatedPrice: number;
  firstYearMargin: number;
  totalCost: number;
  totalIncome: number;
  monthlyIncome: number;
  profit: number;
  totalMargin: number;
  maxDiscount: number;
  months: number;
  monthlyCosts: number[];
  setupPrice: number;
  viable: boolean;
}

export const SCOPE_ITEMS = [
  "Gestión y registros del SUT",
  "Capacitaciones programadas",
  "Inspecciones de seguridad y salud",
  "Gestión y control de permisos de trabajo",
  "Identificación y evaluación de riesgos",
  "Plan de acciones preventivas y correctivas",
  "Informes mensuales de gestión",
  "Asesoría a organismos paritarios",
] as const;

export function createInitialQuote(): SstQuoteInput {
  return {
    company: "", ruc: "", contact: "", location: "", activity: null,
    workers: 35, centerCount: 1,
    centers: [{ name: "", place: "", workers: 35, visits: 2 }],
    serviceMode: "external", serviceHours: 16, capacity: 160,
    juniorSalary: 900, seniorSalary: 1200, seniority: 0,
    employerContribution: 11.15, reserveRate: 8.333333, sbu: 0, vacationRate: 4.166667,
    visits: 2, visitCost: 30, useProtege: true, protegeMonthly: 100, protegeSetup: 200,
    otherCosts: 0, adminRate: 8, coordination: 0,
    scope: [...SCOPE_ITEMS], extraActivities: "", term: 12,
    targetMargin: 30, discount: 0, minimumMargin: 20, secondYearIncrease: 0,
    issuerBusiness: "", issuerRuc: "", signer: "", signerRole: "", validity: 15, remarks: "",
  };
}
