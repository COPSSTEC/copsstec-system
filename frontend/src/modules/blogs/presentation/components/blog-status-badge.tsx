import { VISIBLE_BLOG_STATE_ID } from "@/modules/blogs/domain/types";

interface BlogStatusBadgeProps {
  stateId: number;
}

export function BlogStatusBadge({ stateId }: BlogStatusBadgeProps) {
  const visible = stateId === VISIBLE_BLOG_STATE_ID;

  return (
    <span className={`status-badge ${visible ? "status-badge-success" : "status-badge-danger"}`}>
      {visible ? "VISIBLE" : "OCULTO"}
    </span>
  );
}
