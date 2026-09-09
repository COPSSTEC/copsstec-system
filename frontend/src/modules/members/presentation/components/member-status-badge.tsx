import { ENABLED_STATE_ID } from "@/modules/members/domain/types";

interface MemberStatusBadgeProps {
  stateId: number;
  label: string;
}

export function MemberStatusBadge({ stateId, label }: MemberStatusBadgeProps) {
  const variant = stateId === ENABLED_STATE_ID ? "success" : "danger";

  return <span className={`status-badge status-badge-${variant}`}>{label}</span>;
}
