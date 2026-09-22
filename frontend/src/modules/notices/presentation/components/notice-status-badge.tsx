import {
  VISIBLE_NOTICE_STATE_ID,
  isNoticeScheduled,
  type AdminNotice,
} from "@/modules/notices/domain/types";

interface NoticeStatusBadgeProps {
  notice: Pick<AdminNotice, "state_id" | "published_at">;
}

export function NoticeStatusBadge({ notice }: NoticeStatusBadgeProps) {
  if (isNoticeScheduled(notice)) {
    return <span className="status-badge status-badge-warning">PROGRAMADO</span>;
  }

  const visible = notice.state_id === VISIBLE_NOTICE_STATE_ID;
  return (
    <span className={`status-badge ${visible ? "status-badge-success" : "status-badge-danger"}`}>
      {visible ? "VISIBLE" : "OCULTO"}
    </span>
  );
}
