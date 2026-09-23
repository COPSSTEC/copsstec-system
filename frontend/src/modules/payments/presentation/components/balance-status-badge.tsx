import { balanceStatusLabel, formatUsd } from "@/modules/payments/domain/types";

interface BalanceStatusBadgeProps {
  status: string;
  amount?: string | number | null;
}

function variantFor(status: string): string {
  if (status === "al_dia") {
    return "success";
  }
  if (status === "saldo_pendiente") {
    return "danger";
  }
  return "muted";
}

export function BalanceStatusBadge({ status, amount }: BalanceStatusBadgeProps) {
  const amountLabel =
    amount == null || amount === "" ? null : formatUsd(amount);

  return (
    <span className={`status-badge status-badge-${variantFor(status)}`}>
      {balanceStatusLabel(status)}
      {amountLabel ? ` · ${amountLabel}` : ""}
    </span>
  );
}
