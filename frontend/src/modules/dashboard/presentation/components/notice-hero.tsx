import type { MemberFeedNotice } from "@/modules/dashboard/domain/types";
import { noticeCoverSrc } from "@/modules/notices/domain/types";
import { NoticeImportanceBadge } from "@/modules/notices/presentation/components/notice-importance-badge";

interface NoticeHeroProps {
  notice: MemberFeedNotice;
  onOpen: (notice: MemberFeedNotice) => void;
}

export function NoticeHero({ notice, onOpen }: NoticeHeroProps) {
  const cover = noticeCoverSrc(notice.image);

  return (
    <article className="newspaper-hero">
      <button className="newspaper-hero-button" onClick={() => onOpen(notice)} type="button">
        <div
          className="newspaper-hero-cover"
          style={cover ? { backgroundImage: `url(${cover})` } : undefined}
        />
        <div className="newspaper-hero-body">
          <div className="newspaper-hero-meta">
            <NoticeImportanceBadge importance={notice.importance} />
            <span className="eyebrow">Titular</span>
          </div>
          <h2>{notice.title}</h2>
          {notice.excerpt ? <p>{notice.excerpt}</p> : null}
          <span className="newspaper-cta">Leer aviso</span>
        </div>
      </button>
    </article>
  );
}
