import { subscriptionStatusLabel } from "@/modules/payments/domain/types";

interface SubscriptionStatusBadgeProps {
  status: string;
}

function variantFor(status: string): string {
  if (status === "al_dia") {
    return "success";
  }
  if (status === "gracia") {
    return "warning";
  }
  if (status === "vencida") {
    return "danger";
  }
  return "muted";
}

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  return (
    <span className={`status-badge status-badge-${variantFor(status)}`}>
      {subscriptionStatusLabel(status)}
    </span>
  );
}
