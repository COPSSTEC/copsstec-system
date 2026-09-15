"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { blogCoverSrc, formatBlogDate, type PublicBlog } from "@/modules/blogs/domain/types";
import { getPublicBlog } from "@/modules/blogs/infrastructure/blogs-api";
import { PublicFooter } from "@/shared/components/public-footer";
import { PublicSiteHeader } from "@/shared/components/public-site-header";

interface PublicBlogDetailPageProps {
  blogId: number;
}

export function PublicBlogDetailPage({ blogId }: PublicBlogDetailPageProps) {
  const [blog, setBlog] = useState<PublicBlog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const cover = blogCoverSrc(blog?.image);

  useEffect(() => {
    async function loadBlog() {
      try {
        setBlog(await getPublicBlog(blogId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el blog.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadBlog();
  }, [blogId]);

  return (
    <main className="public-page blog-detail-page">
      <PublicSiteHeader current="blogs" />

      {isLoading ? <p className="muted">Cargando artículo...</p> : null}
      {error ? (
        <section className="card">
          <h1>Artículo no disponible</h1>
          <p className="form-error">{error}</p>
          <Link className="secondary-button button-link" href="/blogs">
            Volver a blogs
          </Link>
        </section>
      ) : null}

      {blog ? (
        <article className="blog-article">
          {cover ? (
            <div className="blog-article-cover" style={{ backgroundImage: `url(${cover})` }} />
          ) : null}
          <header className="blog-article-header">
            <h1>{blog.title}</h1>
            {blog.created_at ? <p className="muted">{formatBlogDate(blog.created_at)}</p> : null}
          </header>
          <div className="blog-content" dangerouslySetInnerHTML={{ __html: blog.description }} />
          <div className="hero-actions">
            <Link className="secondary-button button-link" href="/blogs">
              Volver a blogs
            </Link>
          </div>
        </article>
      ) : null}
      <PublicFooter />
    </main>
  );
}
