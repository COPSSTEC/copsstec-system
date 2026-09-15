import Link from "next/link";

import { blogCoverSrc, formatBlogDate, type PublicBlogListItem } from "@/modules/blogs/domain/types";

interface BlogCardProps {
  blog: PublicBlogListItem;
}

export function BlogCard({ blog }: BlogCardProps) {
  const cover = blogCoverSrc(blog.image);

  return (
    <article className="blog-card">
      <Link className="blog-card-link" href={`/blogs/${blog.id}`}>
        <div
          className="blog-card-cover"
          style={cover ? { backgroundImage: `url(${cover})` } : undefined}
        />
        <div className="blog-card-body">
          {blog.created_at ? <p className="eyebrow">{formatBlogDate(blog.created_at)}</p> : null}
          <h3>{blog.title}</h3>
          {blog.excerpt ? <p className="muted">{blog.excerpt}</p> : null}
          <span className="blog-card-cta">Leer artículo</span>
        </div>
      </Link>
    </article>
  );
}
