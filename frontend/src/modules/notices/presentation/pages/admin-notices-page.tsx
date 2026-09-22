"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { ConfirmActionModal } from "@/modules/members/presentation/modals/confirm-action-modal";
import {
  EMPTY_NOTICE_FORM,
  HIDDEN_NOTICE_STATE_ID,
  VISIBLE_NOTICE_STATE_ID,
  formatNoticeDate,
  fromDatetimeLocalValue,
  noticeCoverSrc,
  toDatetimeLocalValue,
  type AdminNotice,
  type NoticeFormInput,
} from "@/modules/notices/domain/types";
import {
  createNotice,
  deleteNotice,
  listAdminNotices,
  setNoticeVisibility,
  updateNotice,
} from "@/modules/notices/infrastructure/notices-api";
import { NoticeActionsMenu } from "@/modules/notices/presentation/components/notice-actions-menu";
import { NoticeImportanceBadge } from "@/modules/notices/presentation/components/notice-importance-badge";
import { NoticeStatusBadge } from "@/modules/notices/presentation/components/notice-status-badge";
import { NoticeFormModal } from "@/modules/notices/presentation/modals/notice-form-modal";
import { RoleGate } from "@/shared/components/role-gate";

export function AdminNoticesPage() {
  const token = useMemo(() => getStoredToken(), []);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [selected, setSelected] = useState<AdminNotice | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<AdminNotice | null>(null);
  const [form, setForm] = useState<NoticeFormInput>(EMPTY_NOTICE_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<{ type: "delete" | "hide" | "show"; item: AdminNotice } | null>(
    null,
  );

  const loadNotices = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const items = await listAdminNotices(token);
      setNotices(items);
      setSelected((current) => (current ? items.find((item) => item.id === current.id) ?? null : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los avisos.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  function openCreate() {
    setEditingNotice(null);
    setForm(EMPTY_NOTICE_FORM);
    setCoverFile(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(item: AdminNotice) {
    setSelected(item);
    setEditingNotice(item);
    setForm({
      title: item.title,
      description: item.description,
      state_id: item.state_id,
      importance: item.importance,
      published_at: toDatetimeLocalValue(item.published_at),
    });
    setCoverFile(null);
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingNotice(null);
    setCoverFile(null);
    setFormError(null);
  }

  function handleFormChange(field: keyof NoticeFormInput, value: string | number) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    if (!editingNotice && coverFile === null) {
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
    payload.append("importance", form.importance);
    payload.append("published_at", fromDatetimeLocalValue(form.published_at));
    if (coverFile) {
      payload.append("image", coverFile);
    }

    try {
      const saved = editingNotice
        ? await updateNotice(token, editingNotice.id, payload)
        : await createNotice(token, payload);
      setNotice(editingNotice ? "Aviso actualizado correctamente." : "Aviso creado correctamente.");
      closeForm();
      await loadNotices();
      setSelected(saved);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar el aviso.");
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
        await deleteNotice(token, confirm.item.id);
        setNotice("Aviso eliminado correctamente.");
        setSelected((current) => (current?.id === confirm.item.id ? null : current));
      } else {
        const nextState = confirm.type === "hide" ? HIDDEN_NOTICE_STATE_ID : VISIBLE_NOTICE_STATE_ID;
        const updated = await setNoticeVisibility(token, confirm.item.id, nextState);
        setNotice(nextState === VISIBLE_NOTICE_STATE_ID ? "Aviso visible." : "Aviso oculto.");
        setSelected((current) => (current?.id === updated.id ? updated : current));
      }
      setConfirm(null);
      await loadNotices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const confirmCopy = confirm
    ? {
        delete: {
          title: "Eliminar aviso",
          description: `Se ocultará y eliminará lógicamente “${confirm.item.title}”.`,
          confirmLabel: "Eliminar",
          danger: true,
        },
        hide: {
          title: "Ocultar aviso",
          description: `“${confirm.item.title}” dejará de aparecer en el dashboard de socios.`,
          confirmLabel: "Ocultar",
          danger: true,
        },
        show: {
          title: "Mostrar aviso",
          description: `“${confirm.item.title}” volverá a ser visible para los socios cuando llegue su fecha.`,
          confirmLabel: "Mostrar",
          danger: false,
        },
      }[confirm.type]
    : null;

  const selectedCover = noticeCoverSrc(selected?.image);

  return (
    <RoleGate requiredAccess="admin">
      <section className="page-heading page-heading-actions">
        <div>
          <h1>Avisos</h1>
          <p>Comunica al padrón con importancia, portada y fecha de publicación.</p>
        </div>
        <div className="hero-actions">
          <button className="create-button" onClick={openCreate} type="button">
            Crear aviso
          </button>
        </div>
      </section>

      {notice ? <p className="action-alert action-alert-success">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p className="muted">Cargando avisos...</p> : null}

      {!isLoading && notices.length === 0 ? (
        <section className="card">
          <h2>Aún no hay avisos</h2>
          <p className="muted">Crea el primero con título, contenido enriquecido, importancia y una portada.</p>
        </section>
      ) : null}

      <section className="admin-blogs-layout">
        <div className="blogs-grid">
          {notices.map((item) => {
            const cover = noticeCoverSrc(item.image);
            return (
              <article
                className={`blog-card admin-blog-card ${selected?.id === item.id ? "is-selected" : ""}`}
                key={item.id}
              >
                <button className="blog-card-select" onClick={() => setSelected(item)} type="button">
                  <div
                    className="blog-card-cover"
                    style={cover ? { backgroundImage: `url(${cover})` } : undefined}
                  />
                  <div className="blog-card-body">
                    <div className="blog-card-meta">
                      <NoticeStatusBadge notice={item} />
                      <NoticeImportanceBadge importance={item.importance} />
                      {item.created_at ? (
                        <span className="muted">{formatNoticeDate(item.created_at)}</span>
                      ) : null}
                    </div>
                    <h3>{item.title}</h3>
                    {item.excerpt ? <p className="muted">{item.excerpt}</p> : null}
                  </div>
                </button>
                <div className="blog-card-actions">
                  <NoticeActionsMenu
                    notice={item}
                    onDelete={(current) => setConfirm({ type: "delete", item: current })}
                    onEdit={openEdit}
                    onToggleVisibility={(current) =>
                      setConfirm({
                        type: current.state_id === VISIBLE_NOTICE_STATE_ID ? "hide" : "show",
                        item: current,
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
                <NoticeActionsMenu
                  notice={selected}
                  onDelete={(current) => setConfirm({ type: "delete", item: current })}
                  onEdit={openEdit}
                  onToggleVisibility={(current) =>
                    setConfirm({
                      type: current.state_id === VISIBLE_NOTICE_STATE_ID ? "hide" : "show",
                      item: current,
                    })
                  }
                />
                <NoticeStatusBadge notice={selected} />
                <NoticeImportanceBadge importance={selected.importance} />
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
        <NoticeFormModal
          coverFile={coverFile}
          error={formError}
          form={form}
          isSubmitting={isSubmitting}
          notice={editingNotice}
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
