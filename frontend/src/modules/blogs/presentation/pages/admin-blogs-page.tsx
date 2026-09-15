"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import {
  EMPTY_BLOG_FORM,
  HIDDEN_BLOG_STATE_ID,
  VISIBLE_BLOG_STATE_ID,
  blogCoverSrc,
  formatBlogDate,
  type AdminBlog,
  type BlogFormInput,
} from "@/modules/blogs/domain/types";
import {
  createBlog,
  deleteBlog,
  listAdminBlogs,
  setBlogVisibility,
  updateBlog,
} from "@/modules/blogs/infrastructure/blogs-api";
import { BlogActionsMenu } from "@/modules/blogs/presentation/components/blog-actions-menu";
import { BlogStatusBadge } from "@/modules/blogs/presentation/components/blog-status-badge";
import { BlogFormModal } from "@/modules/blogs/presentation/modals/blog-form-modal";
import { ConfirmActionModal } from "@/modules/members/presentation/modals/confirm-action-modal";
import { RoleGate } from "@/shared/components/role-gate";

export function AdminBlogsPage() {
  const token = useMemo(() => getStoredToken(), []);
  const [blogs, setBlogs] = useState<AdminBlog[]>([]);
  const [selected, setSelected] = useState<AdminBlog | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<AdminBlog | null>(null);
  const [form, setForm] = useState<BlogFormInput>(EMPTY_BLOG_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<{ type: "delete" | "hide" | "show"; blog: AdminBlog } | null>(
    null,
  );

  const loadBlogs = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const items = await listAdminBlogs(token);
      setBlogs(items);
      setSelected((current) => (current ? items.find((item) => item.id === current.id) ?? null : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los blogs.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadBlogs();
  }, [loadBlogs]);

  function openCreate() {
    setEditingBlog(null);
    setForm(EMPTY_BLOG_FORM);
    setCoverFile(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(blog: AdminBlog) {
    setSelected(blog);
    setEditingBlog(blog);
    setForm({
      title: blog.title,
      description: blog.description,
      state_id: blog.state_id,
    });
    setCoverFile(null);
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingBlog(null);
    setCoverFile(null);
    setFormError(null);
  }

  function handleFormChange(field: keyof BlogFormInput, value: string | number) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    if (!editingBlog && coverFile === null) {
      setFormError("Debes subir una imagen de portada.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setError(null);
    setNotice(null);

    const payload = new FormData();
    payload.append("title", form.title);
    payload.append("description", form.description);
    payload.append("state_id", String(form.state_id));
    if (coverFile) {
      payload.append("image", coverFile);
    }

    try {
      const saved = editingBlog
        ? await updateBlog(token, editingBlog.id, payload)
        : await createBlog(token, payload);
      setNotice(editingBlog ? "Blog actualizado correctamente." : "Blog creado correctamente.");
      closeForm();
      await loadBlogs();
      setSelected(saved);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar el blog.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!token || !confirm) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      if (confirm.type === "delete") {
        await deleteBlog(token, confirm.blog.id);
        setNotice("Blog eliminado correctamente.");
        setSelected((current) => (current?.id === confirm.blog.id ? null : current));
      } else {
        const nextState =
          confirm.type === "hide" ? HIDDEN_BLOG_STATE_ID : VISIBLE_BLOG_STATE_ID;
        const updated = await setBlogVisibility(token, confirm.blog.id, nextState);
        setNotice(nextState === VISIBLE_BLOG_STATE_ID ? "Blog visible." : "Blog oculto.");
        setSelected((current) => (current?.id === updated.id ? updated : current));
      }
      setConfirm(null);
      await loadBlogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const confirmCopy = confirm
    ? {
        delete: {
          title: "Eliminar blog",
          description: `Se ocultará y eliminará lógicamente “${confirm.blog.title}”.`,
          confirmLabel: "Eliminar",
          danger: true,
        },
        hide: {
          title: "Ocultar blog",
          description: `“${confirm.blog.title}” dejará de aparecer en la sección pública.`,
          confirmLabel: "Ocultar",
          danger: true,
        },
        show: {
          title: "Mostrar blog",
          description: `“${confirm.blog.title}” volverá a ser visible en /blogs.`,
          confirmLabel: "Mostrar",
          danger: false,
        },
      }[confirm.type]
    : null;

  const selectedCover = blogCoverSrc(selected?.image);

  return (
    <RoleGate requiredAccess="admin">
      <section className="page-heading page-heading-actions">
        <div>
          <h1>Blogs</h1>
          <p>Publica artículos con texto enriquecido e imagen de portada.</p>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button button-link" href="/blogs">
            Ver sección pública
          </Link>
          <button className="create-button" onClick={openCreate} type="button">
            Crear blog
          </button>
        </div>
      </section>

      {notice ? <p className="action-alert action-alert-success">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p className="muted">Cargando blogs...</p> : null}

      {!isLoading && blogs.length === 0 ? (
        <section className="card">
          <h2>Aún no hay blogs</h2>
          <p className="muted">Crea el primero con título, contenido enriquecido y una portada.</p>
        </section>
      ) : null}

      <section className="admin-blogs-layout">
        <div className="blogs-grid">
          {blogs.map((blog) => {
            const cover = blogCoverSrc(blog.image);
            return (
              <article
                className={`blog-card admin-blog-card ${selected?.id === blog.id ? "is-selected" : ""}`}
                key={blog.id}
              >
                <button className="blog-card-select" onClick={() => setSelected(blog)} type="button">
                  <div
                    className="blog-card-cover"
                    style={cover ? { backgroundImage: `url(${cover})` } : undefined}
                  />
                  <div className="blog-card-body">
                    <div className="blog-card-meta">
                      <BlogStatusBadge stateId={blog.state_id} />
                      {blog.created_at ? (
                        <span className="muted">{formatBlogDate(blog.created_at)}</span>
                      ) : null}
                    </div>
                    <h3>{blog.title}</h3>
                    {blog.excerpt ? <p className="muted">{blog.excerpt}</p> : null}
                  </div>
                </button>
                <div className="blog-card-actions">
                  <BlogActionsMenu
                    blog={blog}
                    onDelete={(item) => setConfirm({ type: "delete", blog: item })}
                    onEdit={openEdit}
                    onToggleVisibility={(item) =>
                      setConfirm({
                        type: item.state_id === VISIBLE_BLOG_STATE_ID ? "hide" : "show",
                        blog: item,
                      })
                    }
                  />
                </div>
              </article>
            );
          })}
        </div>

        {selected ? (
          <article className="blog-article admin-blog-preview">
            {selectedCover ? (
              <div
                className="blog-article-cover"
                style={{ backgroundImage: `url(${selectedCover})` }}
              />
            ) : null}
            <header className="blog-article-header">
              <h2>{selected.title}</h2>
              <div className="blog-article-toolbar">
                <BlogActionsMenu
                  blog={selected}
                  onDelete={(item) => setConfirm({ type: "delete", blog: item })}
                  onEdit={openEdit}
                  onToggleVisibility={(item) =>
                    setConfirm({
                      type: item.state_id === VISIBLE_BLOG_STATE_ID ? "hide" : "show",
                      blog: item,
                    })
                  }
                />
                <BlogStatusBadge stateId={selected.state_id} />
              </div>
            </header>
            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: selected.description }}
            />
          </article>
        ) : null}
      </section>

      {formOpen ? (
        <BlogFormModal
          blog={editingBlog}
          coverFile={coverFile}
          error={formError}
          form={form}
          isSubmitting={isSubmitting}
          onChange={handleFormChange}
          onClose={closeForm}
          onCoverChange={setCoverFile}
          onSubmit={handleSubmit}
        />
      ) : null}

      {confirm && confirmCopy ? (
        <ConfirmActionModal
          confirmLabel={confirmCopy.confirmLabel}
          danger={confirmCopy.danger}
          description={confirmCopy.description}
          isSubmitting={isSubmitting}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void handleConfirm()}
          title={confirmCopy.title}
        />
      ) : null}
    </RoleGate>
  );
}
