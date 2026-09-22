import type { ReactNode } from "react";

interface NewspaperFeedColumnProps {
  eyebrow: string;
  title: string;
  empty: string;
  children: ReactNode;
  isEmpty: boolean;
}

export function NewspaperFeedColumn({
  eyebrow,
  title,
  empty,
  children,
  isEmpty,
}: NewspaperFeedColumnProps) {
  return (
    <section className="newspaper-column">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {isEmpty ? <p className="muted">{empty}</p> : <div className="newspaper-column-list">{children}</div>}
    </section>
  );
}
