"use client";

import type { MemberFeedNotice } from "@/modules/dashboard/domain/types";
import { noticeCoverSrc } from "@/modules/notices/domain/types";
import { NoticeImportanceBadge } from "@/modules/notices/presentation/components/notice-importance-badge";

interface NoticeDetailModalProps {
  notice: MemberFeedNotice;
  onClose: () => void;
}

export function NoticeDetailModal({ notice, onClose }: NoticeDetailModalProps) {
  const cover = noticeCoverSrc(notice.image);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <article className="newspaper-notice-detail" onClick={(event) => event.stopPropagation()}>
        <header className="blog-form-sheet-header">
          <div>
            <NoticeImportanceBadge importance={notice.importance} />
            <h2>{notice.title}</h2>
          </div>
          <button aria-label="Cerrar" className="blog-form-close" onClick={onClose} type="button">
            ×
          </button>
        </header>
        {cover ? (
          <div className="newspaper-notice-detail-cover" style={{ backgroundImage: `url(${cover})` }} />
        ) : null}
        <div className="blog-content" dangerouslySetInnerHTML={{ __html: notice.description }} />
      </article>
    </div>
  );
}
