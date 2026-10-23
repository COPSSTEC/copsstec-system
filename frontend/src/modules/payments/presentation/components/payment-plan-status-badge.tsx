import { paymentPlanStatusLabel } from "@/modules/payments/domain/types";

interface PaymentPlanStatusBadgeProps {
  status: string | null | undefined;
}

function variantFor(status: string): string {
  if (status === "active") {
    return "info";
  }
  if (status === "completed") {
    return "success";
  }
  return "muted";
}

export function PaymentPlanStatusBadge({ status }: PaymentPlanStatusBadgeProps) {
  const value = status || "none";
  return <span className={`status-badge status-badge-${variantFor(value)}`}>{paymentPlanStatusLabel(value)}</span>;
}
