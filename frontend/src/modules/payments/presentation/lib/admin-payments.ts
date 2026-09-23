import {
  formatIsoDate,
  type MemberSubscriptionRow,
} from "@/modules/payments/domain/types";

const ENABLED_STATE_ID = 1;

export function hasPendingBalance(row: MemberSubscriptionRow): boolean {
  if (row.balance_status === "saldo_pendiente") {
    return true;
  }
  if (row.balance_status === "al_dia") {
    return false;
  }
  return Number(row.pending_balance ?? 0) > 0;
}

export function canSendAgreement(row: MemberSubscriptionRow): boolean {
  if (!hasPendingBalance(row)) {
    return false;
  }
  if (row.state_id == null) {
    return true;
  }
  return row.state_id === ENABLED_STATE_ID;
}

export function hasSignedAuthorization(row: MemberSubscriptionRow): boolean {
  return Boolean(row.has_signed_authorization);
}

export function hasIdentityDocument(row: MemberSubscriptionRow): boolean {
  return Boolean(row.has_identity_document);
}

export function rowBalanceStatus(row: MemberSubscriptionRow): string {
  if (row.balance_status) {
    return row.balance_status;
  }
  return Number(row.pending_balance ?? 0) > 0 ? "saldo_pendiente" : "al_dia";
}

export function coverageRange(row: MemberSubscriptionRow): string {
  const end = formatIsoDate(row.coverage_until);
  const start = formatIsoDate(row.last_payment_at || row.enrolled_on);
  if (start !== "—" && end !== "—") {
    return `${start} – ${end}`;
  }
  return end;
}

export function monthOverMonth(current: number, previous: number): number | null {
  if (previous <= 0) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatKpiUsd(amount: string | number): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(value)) {
    return `${amount}`;
  }
  return `$${value.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMomHint(percent: number | null, extra?: string): string {
  if (percent === null) {
    return extra ?? "—";
  }
  const rounded = Number.isInteger(percent) ? String(percent) : percent.toFixed(1);
  const sign = percent > 0 ? "+" : "";
  return extra ? `${sign}${rounded}% ${extra}` : `${sign}${rounded}% vs. mes anterior`;
}

export function momTone(percent: number | null): "up" | "down" | "neutral" {
  if (percent === null || percent === 0) {
    return "neutral";
  }
  return percent > 0 ? "up" : "down";
}

export function shareHint(part: number, total: number): string {
  if (total <= 0) {
    return "—";
  }
  return `del total (${Math.round((part / total) * 100)}%)`;
}

export function trendFromPercent(percent: number | null): number[] {
  if (percent === null) {
    return [8, 8, 8, 8, 8];
  }
  if (percent > 0) {
    return [4, 5, 6, 8, 11];
  }
  if (percent < 0) {
    return [11, 9, 7, 6, 4];
  }
  return [6, 6, 6, 6, 6];
}

export function splitMemberName(name: string): { names: string; lastname: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { names: name.trim(), lastname: "" };
  }
  return { names: parts.slice(0, -1).join(" "), lastname: parts.at(-1) ?? "" };
}
