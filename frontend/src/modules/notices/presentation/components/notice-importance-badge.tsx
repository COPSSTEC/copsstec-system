import type { NoticeImportance } from "@/modules/notices/domain/types";

const LABELS: Record<NoticeImportance, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

interface NoticeImportanceBadgeProps {
  importance: NoticeImportance;
}

export function NoticeImportanceBadge({ importance }: NoticeImportanceBadgeProps) {
  return (
    <span className={`notice-importance-badge notice-importance-${importance}`}>
      {LABELS[importance]}
    </span>
  );
}
