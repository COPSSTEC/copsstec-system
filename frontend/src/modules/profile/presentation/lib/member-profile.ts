import type { Profile } from "@/modules/auth/domain/types";
import { isMembershipActive, membershipStatusTitle } from "@/modules/payments/presentation/lib/member-payments";
import type { SubscriptionSummary } from "@/modules/payments/domain/types";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export type ProfileSection = "personal" | "contact" | "academic";

export const CARNET_ORG_NAME = "COLEGIO DE PROFESIONALES DE SEGURIDAD Y SALUD EN EL TRABAJO DEL ECUADOR";

export function displayValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "No registrado";
  }
  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }
  return String(value);
}

export function memberCode(profile: Profile): string {
  const raw = (profile.cod ?? "").toString().trim();
  const suffix = /^\d+$/.test(raw) ? raw.padStart(5, "0") : raw || String(profile.user_id).padStart(5, "0");
  return `2842018-${suffix}`;
}

export function parseProfileDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parts = value.replace(/-/g, "/").split("/").filter(Boolean);
  if (parts.length !== 3) {
    return null;
  }
  if (parts[0].length === 4) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
}

export function formatMonthYear(value: string | null | undefined): string {
  const date = parseProfileDate(value);
  if (!date || Number.isNaN(date.getTime())) {
    return displayValue(value);
  }
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function coveragePeriod(subscription: SubscriptionSummary | null): string {
  if (!subscription?.coverage_until) {
    return "Sin vigencia registrada";
  }
  const date = new Date(subscription.coverage_until);
  if (Number.isNaN(date.getTime())) {
    return subscription.coverage_until;
  }
  const year = date.getFullYear();
  return `Ene. ${year} — Dic. ${year}`;
}

export function membershipHeadline(subscription: SubscriptionSummary | null, stateId: number): string {
  if (stateId !== 1) {
    return "Miembro inactivo";
  }
  if (isMembershipActive(subscription?.status)) {
    return "Miembro activo";
  }
  if (subscription?.status === "vencida") {
    return "Membresía vencida";
  }
  return `Miembro ${membershipStatusTitle(subscription?.status).toLowerCase()}`;
}

export function academicTitle(profile: Profile): string {
  return (profile.fourth_title || profile.title_academic || "").trim() || "No registrado";
}

export const PROFILE_BENEFITS = [
  { id: "training", label: "Capacitación especializada", icon: "graduation" as const },
  { id: "events", label: "Eventos y congresos", icon: "calendar" as const },
  { id: "library", label: "Biblioteca digital", icon: "book" as const },
  { id: "network", label: "Red profesional", icon: "users" as const },
];
