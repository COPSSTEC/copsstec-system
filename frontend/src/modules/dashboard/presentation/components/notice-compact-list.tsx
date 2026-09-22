import type { MemberFeedNotice } from "@/modules/dashboard/domain/types";

interface NoticeCompactListProps {
  notices: MemberFeedNotice[];
  onOpen: (notice: MemberFeedNotice) => void;
}

export function NoticeCompactList({ notices, onOpen }: NoticeCompactListProps) {
  if (notices.length === 0) {
    return null;
  }

  return (
    <aside className="newspaper-compact">
      <p className="eyebrow">Avisos</p>
      <h2>En breve</h2>
      <ul>
        {notices.map((notice) => (
          <li key={notice.id}>
            <button onClick={() => onOpen(notice)} type="button">
              <span>{notice.title}</span>
              {notice.excerpt ? <small>{notice.excerpt}</small> : null}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
