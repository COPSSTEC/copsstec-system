import { agreementStatusLabel } from "@/modules/payments/domain/types";

interface AgreementStatusBadgeProps {
  status: string;
}

function variantFor(status: string): string {
  if (status === "uploaded") {
    return "success";
  }
  if (status === "partial") {
    return "warning";
  }
  if (status === "sent") {
    return "info";
  }
  return "muted";
}

export function AgreementStatusBadge({ status }: AgreementStatusBadgeProps) {
  return (
    <span className={`status-badge status-badge-${variantFor(status)}`}>
      {agreementStatusLabel(status)}
    </span>
  );
}
