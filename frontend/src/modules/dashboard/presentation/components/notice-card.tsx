import type { MemberFeedNotice } from "@/modules/dashboard/domain/types";
import { noticeCoverSrc } from "@/modules/notices/domain/types";
import { NoticeImportanceBadge } from "@/modules/notices/presentation/components/notice-importance-badge";

interface NoticeCardProps {
  notice: MemberFeedNotice;
  onOpen: (notice: MemberFeedNotice) => void;
}

export function NoticeCard({ notice, onOpen }: NoticeCardProps) {
  const cover = noticeCoverSrc(notice.image);

  return (
    <article className="newspaper-notice-card">
      <button onClick={() => onOpen(notice)} type="button">
        <div
          className="newspaper-notice-cover"
          style={cover ? { backgroundImage: `url(${cover})` } : undefined}
        />
        <div>
          <NoticeImportanceBadge importance={notice.importance} />
          <h3>{notice.title}</h3>
          {notice.excerpt ? <p className="muted">{notice.excerpt}</p> : null}
        </div>
      </button>
    </article>
  );
}
