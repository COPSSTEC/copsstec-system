import { paymentStatusLabel } from "@/modules/payments/domain/types";

interface PaymentStatusBadgeProps {
  status: string;
}

function variantFor(status: string): string {
  if (status === "approved") {
    return "success";
  }
  if (status === "rejected") {
    return "danger";
  }
  if (status === "pending_review") {
    return "warning";
  }
  if (status === "pending_payment") {
    return "info";
  }
  return "muted";
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  return (
    <span className={`status-badge status-badge-${variantFor(status)}`}>{paymentStatusLabel(status)}</span>
  );
}
