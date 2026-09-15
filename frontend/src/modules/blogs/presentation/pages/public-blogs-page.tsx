"use client";

import { useEffect, useState } from "react";

import type { PublicBlogListItem } from "@/modules/blogs/domain/types";
import { listPublicBlogs } from "@/modules/blogs/infrastructure/blogs-api";
import { BlogCard } from "@/modules/blogs/presentation/components/blog-card";
import { PublicFooter } from "@/shared/components/public-footer";
import { PublicSiteHeader } from "@/shared/components/public-site-header";

export function PublicBlogsPage() {
  const [blogs, setBlogs] = useState<PublicBlogListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBlogs() {
      try {
        setBlogs(await listPublicBlogs());
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los blogs.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadBlogs();
  }, []);

  return (
    <main className="public-page">
      <PublicSiteHeader current="blogs" />

      <section className="page-heading">
        <div>
          <h1>Blogs COPSSTEC</h1>
          <p>Artículos y novedades sobre seguridad y salud en el trabajo.</p>
        </div>
      </section>

      {isLoading ? <p className="muted">Cargando blogs...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {!isLoading && blogs.length === 0 ? (
        <section className="card">
          <h2>No hay artículos visibles</h2>
          <p className="muted">Pronto publicaremos nuevas notas y novedades.</p>
        </section>
      ) : null}

      <section className="blogs-grid">
        {blogs.map((blog) => (
          <BlogCard blog={blog} key={blog.id} />
        ))}
      </section>
      <PublicFooter />
    </main>
  );
}
